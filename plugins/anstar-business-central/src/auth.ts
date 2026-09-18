import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { PublicClientApplication, CryptoProvider, type AccountInfo, type AuthenticationResult, type AuthorizationCodeRequest, type AuthorizationUrlRequest, type Configuration, type INetworkModule, type NetworkRequestOptions, type NetworkResponse, type SilentFlowRequest } from '@azure/msal-node';
import { AuthStore, AuthStoreError } from './auth-store.ts';

export interface AuthConfig { tenantId: string; clientId: string; scope: string; redirectUri: string; cacheDirectory: string }
export interface AuthProvider {
  getAccessToken(): Promise<string>;
  beginLogin(): Promise<{ authorizationUrl: string; expiresInSeconds: number }>;
  status(): Promise<{ authenticated: boolean; loginPending: boolean }>;
  close(): Promise<void>;
}
export interface MsalClient {
  getTokenCache(): { deserialize(value: string): void; serialize(): string };
  getAllAccounts(): Promise<AccountInfo[]>;
  getAuthCodeUrl(request: AuthorizationUrlRequest): Promise<string>;
  acquireTokenByCode(request: AuthorizationCodeRequest): Promise<AuthenticationResult | null>;
  acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult | null>;
}
/** Test seams are constructor-only; never exposed through MCP arguments. */
export interface AuthDependencies { createClient?: (config: Configuration) => MsalClient; fetch?: typeof globalThis.fetch }
export class AuthRequiredError extends Error {
  constructor() { super('Authentication required. Start an explicit sign-in and try again.'); this.name = 'AuthRequiredError'; }
}
const CALLBACK = 'http://localhost:33418/callback/GNmTSc-BOPT4';
const LOGIN_SECONDS = 600;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RESPONSE = 1024 * 1024;

/** Public-cloud-only MSAL transport: no redirects, bounded total time/body. */
export function createAuthNetwork(tenantId: string, fetcher: typeof globalThis.fetch = globalThis.fetch): INetworkModule {
  if (!GUID.test(tenantId)) throw new Error('Invalid authentication configuration.');
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  async function request<T>(method: 'GET' | 'POST', raw: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const u = new URL(raw);
      if (u.origin !== 'https://login.microsoftonline.com' || u.username || u.password || u.hash || raw.includes('%') && /%2[fFeE]|%5[cC]/.test(u.pathname)) throw new Error();
      const discovery = u.pathname === '/common/discovery/instance' && method === 'GET' && u.searchParams.getAll('api-version').length === 1 && u.searchParams.get('api-version') === '1.1' && u.searchParams.getAll('authorization_endpoint').length === 1 && u.searchParams.get('authorization_endpoint') === `${authority}/oauth2/v2.0/authorize` && [...u.searchParams.keys()].every(k => ['api-version', 'authorization_endpoint'].includes(k));
      const metadata = u.pathname === `/${tenantId}/v2.0/.well-known/openid-configuration` && method === 'GET' && !u.search;
      // MSAL 6 appends a UUID correlation ID to token requests.
      const tokenQuery = !u.search || ([...u.searchParams.keys()].length === 1 && u.searchParams.getAll('client-request-id').length === 1 && GUID.test(u.searchParams.get('client-request-id') ?? ''));
      const token = u.pathname === `/${tenantId}/oauth2/v2.0/token` && method === 'POST' && tokenQuery;
      if (!discovery && !metadata && !token) throw new Error();
      if (options?.body && Buffer.byteLength(options.body) > MAX_RESPONSE) throw new Error();
      const response = await fetcher(raw, { method, headers: options?.headers, body: method === 'POST' ? options?.body : undefined, redirect: 'error', signal: controller.signal });
      if (response.status >= 300 && response.status < 400 || response.redirected) throw new Error();
      if (Number(response.headers.get('content-length')) > MAX_RESPONSE) throw new Error();
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) {
        try {
          for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > MAX_RESPONSE) { await reader.cancel(); throw new Error(); } chunks.push(chunk.value); }
        } finally { reader.releaseLock(); }
      }
      return { status: response.status, headers: Object.fromEntries(response.headers), body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as T };
    } catch { throw new Error('Authentication network request failed.'); }
    finally { clearTimeout(timer); controller.abort(); }
  }
  return { sendGetRequestAsync: (url, options) => request('GET', url, options), sendPostRequestAsync: (url, options) => request('POST', url, options) };
}

export function createAuth(config: AuthConfig, deps: AuthDependencies = {}): AuthProvider {
  if (!GUID.test(config.tenantId) || !GUID.test(config.clientId) || config.redirectUri !== CALLBACK || config.scope !== 'https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All') throw new Error('Invalid authentication configuration.');
  const authority = `https://login.microsoftonline.com/${config.tenantId}`;
  const scopes = [config.scope];
  const store = new AuthStore(config.cacheDirectory, createHash('sha256').update(JSON.stringify([config.tenantId, config.clientId, config.scope])).digest('hex'));
  const makeClient = () => (deps.createClient ?? (c => new PublicClientApplication(c)))({ auth: { clientId: config.clientId, authority }, system: { networkClient: createAuthNetwork(config.tenantId, deps.fetch), disableInternalRetries: true, loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => {} } } });
  let closed = false;
  type Pending = { server: Server; state: string; verifier: string; nonce: string; processing: boolean; timer?: NodeJS.Timeout; operation?: Promise<void> };
  let pending: Pending | undefined;
  let starting: Promise<{ authorizationUrl: string; expiresInSeconds: number }> | undefined;
  const operations = new Set<Promise<unknown>>();
  function track<T>(operation: Promise<T>): Promise<T> { operations.add(operation); void operation.then(() => operations.delete(operation), () => operations.delete(operation)); return operation; }
  function validAccount(a: AccountInfo): boolean { return a.tenantId.toLowerCase() === config.tenantId.toLowerCase() && ['login.microsoftonline.com', 'login.windows.net'].includes(a.environment) && !!a.homeAccountId; }
  function validateResult(r: AuthenticationResult | null, selected?: string): AuthenticationResult {
    if (!r || !r.accessToken || !r.account || !validAccount(r.account) || r.tenantId.toLowerCase() !== config.tenantId.toLowerCase() || (r.idTokenClaims as { tid?: string } | undefined)?.tid?.toLowerCase() !== config.tenantId.toLowerCase() || selected && r.account.homeAccountId !== selected) throw new AuthRequiredError();
    return r;
  }
  function finish(flow: Pending): void {
    if (flow.timer) clearTimeout(flow.timer);
    if (pending === flow) pending = undefined;
    flow.server.close(); flow.server.closeIdleConnections();
    flow.verifier = ''; flow.state = ''; flow.nonce = '';
  }
  function respond(response: ServerResponse, status: number, text: string): void {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Connection': 'close', 'Content-Security-Policy': "default-src 'none'" }); response.end(text);
  }
  async function getAccessToken(): Promise<string> {
    if (closed) throw new AuthRequiredError();
    try {
      return await track(store.transaction(async state => {
        const client = makeClient();
        if (state.cache) client.getTokenCache().deserialize(state.cache);
        if (!state.selectedHomeAccountId) throw new AuthRequiredError();
        const accounts = (await client.getAllAccounts()).filter(a => a.homeAccountId === state.selectedHomeAccountId && validAccount(a));
        if (accounts.length !== 1) throw new AuthRequiredError();
        const result = validateResult(await client.acquireTokenSilent({ scopes, account: accounts[0], authority }), state.selectedHomeAccountId);
        state.cache = client.getTokenCache().serialize();
        return result.accessToken;
      }));
    } catch (error) { if (error instanceof AuthStoreError && error.message.includes('locked')) throw error; throw new AuthRequiredError(); }
  }
  async function beginLogin(): Promise<{ authorizationUrl: string; expiresInSeconds: number }> {
    if (closed) throw new AuthRequiredError();
    if (starting) return starting;
    if (pending) throw new Error('A sign-in is already pending.');
    starting = (async () => {
      await store.transaction(async () => {});
      if (closed) throw new AuthRequiredError();
      const pkce = await new CryptoProvider().generatePkceCodes();
      const flow: Pending = { server: createServer({ maxHeaderSize: 16_384 }), state: randomBytes(32).toString('base64url'), verifier: pkce.verifier, nonce: randomBytes(32).toString('base64url'), processing: false };
      pending = flow;
      flow.server.requestTimeout = 10_000; flow.server.headersTimeout = 10_000; flow.server.setTimeout(10_000, socket => socket.destroy());
      flow.server.on('request', (request, response) => {
        const raw = request.url ?? '';
        if (request.method !== 'GET') { respond(response, 405, 'Invalid request.'); return; }
        if (raw.length > 16_384 || raw.split('?')[0] !== '/callback/GNmTSc-BOPT4' || request.headers.host !== 'localhost:33418') { respond(response, 400, 'Invalid request.'); return; }
        const params = new URL(raw, CALLBACK).searchParams;
        const states = params.getAll('state');
        const candidate = Buffer.from(states[0] ?? ''); const expected = Buffer.from(flow.state);
        if (states.length !== 1 || candidate.length !== expected.length || !timingSafeEqual(candidate, expected) || !expected.length) { respond(response, 400, 'Invalid request.'); return; }
        const codes = params.getAll('code'); const errors = params.getAll('error');
        if (codes.length > 1 || errors.length > 1 || codes.length + errors.length !== 1 || !(codes[0] || errors[0])) { respond(response, 400, 'Invalid request.'); return; }
        if (flow.processing || closed || pending !== flow) { respond(response, 409, 'Sign-in is not available.'); return; }
        if (errors.length) { respond(response, 400, 'Sign-in was not completed.'); finish(flow); return; }
        flow.processing = true;
        flow.operation = track((async () => {
          try {
            await store.transaction(async state => {
              if (closed || pending !== flow) throw new AuthRequiredError();
              const client = makeClient();
              if (state.cache) client.getTokenCache().deserialize(state.cache);
              const result = validateResult(await client.acquireTokenByCode({ authority, scopes, code: codes[0], redirectUri: CALLBACK, codeVerifier: flow.verifier, nonce: flow.nonce, state: flow.state }));
              if (closed || pending !== flow) throw new AuthRequiredError();
              state.cache = client.getTokenCache().serialize(); state.selectedHomeAccountId = result.account!.homeAccountId;
            });
            respond(response, 200, 'Sign-in completed. You may close this window.');
          } catch { respond(response, 400, 'Sign-in could not be completed.'); }
          finally { finish(flow); }
        })());
      });
      try {
        await new Promise<void>((resolve, reject) => { flow.server.once('error', reject); flow.server.listen(33418, '127.0.0.1', () => { flow.server.removeListener('error', reject); resolve(); }); });
        flow.server.on('error', () => finish(flow));
        flow.timer = setTimeout(() => finish(flow), LOGIN_SECONDS * 1000); flow.timer.unref();
        const authorizationUrl = await makeClient().getAuthCodeUrl({ authority, scopes, redirectUri: CALLBACK, state: flow.state, nonce: flow.nonce, codeChallenge: pkce.challenge, codeChallengeMethod: 'S256', responseMode: 'query', prompt: 'select_account' });
        const url = new URL(authorizationUrl);
        if (url.origin !== 'https://login.microsoftonline.com' || url.pathname !== `/${config.tenantId}/oauth2/v2.0/authorize` || url.username || url.password || url.hash || closed || pending !== flow) throw new Error();
        return { authorizationUrl, expiresInSeconds: LOGIN_SECONDS };
      } catch { finish(flow); throw new Error('Sign-in could not be started.'); }
    })();
    try { return await starting; } finally { starting = undefined; }
  }
  return {
    getAccessToken, beginLogin,
    async status() { let authenticated = false; try { await getAccessToken(); authenticated = true; } catch (error) { if (!(error instanceof AuthRequiredError)) throw error; } return { authenticated, loginPending: !!pending || !!starting }; },
    async close() { closed = true; if (pending) { const flow = pending; if (flow.operation) await flow.operation; else finish(flow); } await starting?.catch(() => {}); await Promise.allSettled(operations); },
  };
}
