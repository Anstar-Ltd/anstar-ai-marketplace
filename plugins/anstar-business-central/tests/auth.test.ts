import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PublicClientApplication, type AccountInfo, type AuthenticationResult, type AuthorizationCodeRequest, type AuthorizationUrlRequest, type SilentFlowRequest } from '@azure/msal-node';
import { createAuth, createAuthNetwork, AuthRequiredError, type AuthConfig, type MsalClient } from '../src/auth.ts';
import { AuthStore } from '../src/auth-store.ts';
import { privateTestDirectory } from './test-path.ts';

const tenantId = '11111111-1111-1111-1111-111111111111';
const account: AccountInfo = { homeAccountId: 'fixture-home', localAccountId: 'fixture-local', environment: 'login.microsoftonline.com', tenantId, username: 'fixture@example.invalid' };
test('auth accepts the exact scope advertised by the hosted MCP resource', async () => {
  const f = await setup();
  try {
    const auth = createAuth({ ...f.config, scope: 'https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All' }, { createClient: f.createClient });
    await auth.close();
  } finally { await f.cleanup(); }
});
function result(a = account): AuthenticationResult {
  return { authority: `https://login.microsoftonline.com/${tenantId}`, uniqueId: a.localAccountId, tenantId: a.tenantId, scopes: ['fixture'], account: a, idToken: 'fixture-id-token', idTokenClaims: { tid: a.tenantId }, accessToken: 'fixture-access-token', fromCache: false, expiresOn: new Date(Date.now() + 3600_000), tokenType: 'Bearer', correlationId: 'fixture' };
}
async function setup() {
  const root = await privateTestDirectory('bc-auth-test-');
  const config: AuthConfig = { tenantId, clientId: '22222222-2222-2222-2222-222222222222', scope: 'https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All', redirectUri: 'http://localhost:33418/callback/GNmTSc-BOPT4', cacheDirectory: join(root, 'cache') };
  const calls: { url?: AuthorizationUrlRequest; code?: AuthorizationCodeRequest; silent?: SilentFlowRequest; exchanges: number } = { exchanges: 0 };
  let selectedResult = result();
  const createClient = (): MsalClient => {
    let accounts: AccountInfo[] = [];
    return {
      getTokenCache: () => ({ deserialize: value => { accounts = JSON.parse(value).accounts; }, serialize: () => JSON.stringify({ accounts }) }),
      getAllAccounts: async () => accounts,
      getAuthCodeUrl: async request => { calls.url = request; return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?state=${request.state}`; },
      acquireTokenByCode: async request => { calls.code = request; calls.exchanges++; accounts = [selectedResult.account!]; return selectedResult; },
      acquireTokenSilent: async request => { calls.silent = request; return selectedResult; },
    };
  };
  return { config, calls, createClient, setResult: (r: AuthenticationResult) => { selectedResult = r; }, cleanup: () => rm(root, { recursive: true, force: true }) };
}
test('callback validates state before error and rejects duplicate/scalar/path/method attacks', async () => {
  const f = await setup(); const auth = createAuth(f.config, { createClient: f.createClient });
  try {
    await auth.beginLogin(); const state = f.calls.url!.state!;
    for (const query of ['state=bad&error=fixture-secret', `state=${state}&state=${state}&code=x`, `state=${state}&code=x&code=y`, `state=${state}&code=x&error=y`, `state=${state}&code=`]) {
      const response = await callback(query); assert.equal(response.status, 400); assert.doesNotMatch(await response.text(), /fixture-secret/);
      assert.equal((await auth.status()).loginPending, true);
    }
    assert.equal((await callback(`state=${state}&code=x`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`http://localhost:33418/callback/GNmTSc-BOPT4/extra?state=${state}&code=x`)).status, 400);
    assert.equal(f.calls.exchanges, 0);
    assert.equal((await callback(`state=${state}&code=fixture`)).status, 200);
    assert.equal(f.calls.exchanges, 1);
  } finally { await auth.close(); await f.cleanup(); }
});

test('unexpected tenant cannot be persisted or silently used', async () => {
  const f = await setup(); const auth = createAuth(f.config, { createClient: f.createClient });
  try {
    f.setResult(result({ ...account, tenantId: '33333333-3333-3333-3333-333333333333' }));
    await auth.beginLogin();
    assert.equal((await callback(`state=${f.calls.url!.state}&code=fixture`)).status, 400);
    await assert.rejects(auth.getAccessToken(), AuthRequiredError);
    assert.deepEqual(await auth.status(), { authenticated: false, loginPending: false });
  } finally { await auth.close(); await f.cleanup(); }
});

test('network rejects off-authority targets, redirects and oversized responses', async () => {
  let calls = 0; let response = new Response('{}');
  const network = createAuthNetwork(tenantId, async (_url, init) => { calls++; assert.equal(init?.redirect, 'error'); assert.ok(init?.signal); return response; });
  for (const url of ['https://evil.invalid/x', `https://login.microsoftonline.com.evil.invalid/${tenantId}/oauth2/v2.0/token`, `https://login.microsoftonline.com/common/oauth2/v2.0/token`, `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token?evil=x`, `https://user@login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`]) await assert.rejects(network.sendPostRequestAsync(url), /Authentication network request failed/);
  assert.equal(calls, 0);
  const token = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  assert.deepEqual((await network.sendPostRequestAsync(token)).body, {});
  response = new Response('fixture-secret', { status: 302, headers: { Location: 'https://evil.invalid' } });
  await assert.rejects(network.sendPostRequestAsync(token), /Authentication network request failed/);
  response = new Response('x'.repeat(1024 * 1024 + 1));
  await assert.rejects(network.sendPostRequestAsync(token), /Authentication network request failed/);
});

async function callback(query: string, options?: RequestInit) {
  return fetch(`http://localhost:33418/callback/GNmTSc-BOPT4?${query}`, options);
}

test('real MSAL discovers authority, exchanges fixture code and deserializes silent cache', async () => {
  const f = await setup(); const requests: string[] = [];
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  let nonce = '';
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    assert.equal(init?.redirect, 'error');
    if (url.includes('/discovery/instance')) return Response.json({ tenant_discovery_endpoint: `${authority}/v2.0/.well-known/openid-configuration`, metadata: [{ preferred_network: 'login.microsoftonline.com', preferred_cache: 'login.windows.net', aliases: ['login.microsoftonline.com', 'login.windows.net'] }] });
    if (url.endsWith('/.well-known/openid-configuration')) return Response.json({ authorization_endpoint: `${authority}/oauth2/v2.0/authorize`, token_endpoint: `${authority}/oauth2/v2.0/token`, end_session_endpoint: `${authority}/oauth2/v2.0/logout`, issuer: `${authority}/v2.0`, jwks_uri: `${authority}/discovery/v2.0/keys` });
    assert.equal(url.split('?')[0], `${authority}/oauth2/v2.0/token`);
    assert.equal(init?.method, 'POST');
    const refreshing = new URLSearchParams(String(init?.body)).get('grant_type') === 'refresh_token';
    const now = Math.floor(Date.now() / 1000);
    const jwt = [Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ aud: f.config.clientId, iss: `${authority}/v2.0`, iat: now, nbf: now, exp: now + 3600, tid: tenantId, oid: 'fixture-oid', sub: 'fixture-sub', preferred_username: 'fixture@example.invalid', nonce: refreshing ? undefined : nonce })).toString('base64url'), 'fixture-signature'].join('.');
    return Response.json({ token_type: 'Bearer', scope: `${f.config.scope} openid profile offline_access`, expires_in: 3600, ext_expires_in: 3600, access_token: refreshing ? 'fixture-refreshed-token' : 'fixture-access-token', refresh_token: refreshing ? 'fixture-refresh-token-2' : 'fixture-refresh-token', id_token: jwt, client_info: Buffer.from(JSON.stringify({ uid: 'fixture-uid', utid: tenantId })).toString('base64url') });
  };
  let observed: AuthenticationResult | undefined;
  let sdkError = '';
  let auth = createAuth(f.config, { fetch: fetcher, createClient: config => {
    const network = config.system!.networkClient!;
    const post = network.sendPostRequestAsync.bind(network);
    network.sendPostRequestAsync = (url, options) => { requests.push(`post:${url}`); return post(url, options); };
    const client = new PublicClientApplication(config);
    const original = client.acquireTokenByCode.bind(client);
    client.acquireTokenByCode = async request => { try { observed = await original(request); return observed; } catch (error) { sdkError = (error as { errorCode?: string }).errorCode ?? 'unknown'; throw error; } };
    return client;
  } });
  try {
    const login = await auth.beginLogin(); const url = new URL(login.authorizationUrl); nonce = url.searchParams.get('nonce')!;
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    const response = await callback(`state=${url.searchParams.get('state')}&code=fixture-code`);
    assert.equal(response.status, 200, `${await response.text()} sdk=${sdkError} environment=${observed?.account?.environment} requests=${requests.join(',')}`);
    await auth.close(); auth = createAuth(f.config, { fetch: fetcher });
    const before = requests.length;
    assert.equal(await auth.getAccessToken(), 'fixture-access-token');
    assert.equal(requests.length, before, 'silent cache hit should not call network');
    const context = createHash('sha256').update(JSON.stringify([f.config.tenantId, f.config.clientId, f.config.scope])).digest('hex');
    await new AuthStore(f.config.cacheDirectory, context).transaction(async state => {
      const cache = JSON.parse(state.cache);
      for (const token of Object.values(cache.AccessToken) as Record<string, string>[]) { token.expires_on = '1'; token.extended_expires_on = '1'; }
      state.cache = JSON.stringify(cache);
    });
    const second = createAuth(f.config, { fetch: fetcher });
    try {
      const beforeRefresh = requests.length;
      const tokens = await Promise.all([auth.getAccessToken(), second.getAccessToken()]);
      assert.deepEqual(tokens, ['fixture-refreshed-token', 'fixture-refreshed-token']);
      assert.equal(requests.length, beforeRefresh + 1, 'only one refresh; second process-equivalent client rereads refreshed cache');
    } finally { await second.close(); }
  } finally { await auth.close(); await f.cleanup(); }
});

test('login timeout closes listener and no error details escape silent failures', async t => {
  const f = await setup(); const auth = createAuth(f.config, { createClient: f.createClient });
  try {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await auth.beginLogin(); t.mock.timers.tick(600_000);
    assert.deepEqual(await auth.status(), { authenticated: false, loginPending: false });
    await assert.rejects(auth.getAccessToken(), error => error instanceof AuthRequiredError && !error.message.includes('fixture'));
  } finally { t.mock.timers.reset(); await auth.close(); await f.cleanup(); }
});

test('expiry during a code exchange cannot persist the late token generation', async t => {
  const f = await setup(); let release!: () => void; let entered!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const auth = createAuth(f.config, { createClient: () => { const client = f.createClient(); const exchange = client.acquireTokenByCode; client.acquireTokenByCode = async request => { entered(); await barrier; return exchange(request); }; return client; } });
  try {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await auth.beginLogin(); const response = callback(`state=${f.calls.url!.state}&code=fixture`);
    await started; t.mock.timers.tick(600_000); release();
    assert.equal((await response).status, 400);
    assert.equal((await auth.status()).authenticated, false);
  } finally { release(); t.mock.timers.reset(); await auth.close(); await f.cleanup(); }
});

test('network timeout aborts a stalled transport without exposing its error', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const network = createAuthNetwork(tenantId, async (_input, init) => new Promise((_resolve, reject) => { init!.signal!.addEventListener('abort', () => reject(new Error('fixture-secret'))); }));
    const operation = network.sendPostRequestAsync(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`);
    const rejected = assert.rejects(operation, error => error instanceof Error && error.message === 'Authentication network request failed.');
    t.mock.timers.tick(15_000); await rejected;
  } finally { t.mock.timers.reset(); }
});

test('unselected multiple accounts never choose an arbitrary account', async () => {
  const f = await setup(); const auth = createAuth(f.config, { createClient: f.createClient });
  try {
    const context = createHash('sha256').update(JSON.stringify([f.config.tenantId, f.config.clientId, f.config.scope])).digest('hex');
    await new AuthStore(f.config.cacheDirectory, context).transaction(async state => { state.cache = JSON.stringify({ accounts: [account, { ...account, homeAccountId: 'other-fixture' }] }); });
    await assert.rejects(auth.getAccessToken(), AuthRequiredError);
    assert.equal(f.calls.silent, undefined); assert.equal(f.calls.url, undefined);
  } finally { await auth.close(); await f.cleanup(); }
});

test('explicit PKCE login pins account and restart silently uses persisted selection', async () => {
  const f = await setup();
  let auth = createAuth(f.config, { createClient: f.createClient });
  try {
    await assert.rejects(auth.getAccessToken(), AuthRequiredError);
    assert.equal(f.calls.url, undefined);
    const login = await auth.beginLogin();
    assert.equal(login.expiresInSeconds, 600);
    const repeated = await auth.beginLogin();
    assert.equal(repeated.authorizationUrl, login.authorizationUrl);
    assert.ok(repeated.expiresInSeconds > 0 && repeated.expiresInSeconds <= 600);
    assert.equal((await auth.status()).loginPending, true);
    const state = f.calls.url!.state!;
    const response = await callback(`state=${state}&code=fixture-code`);
    assert.equal(response.status, 200, await response.text());
    assert.equal(f.calls.code!.authority, `https://login.microsoftonline.com/${tenantId}`);
    assert.equal(createHash('sha256').update(f.calls.code!.codeVerifier!).digest('base64url'), f.calls.url!.codeChallenge);
    assert.equal(f.calls.url!.codeChallengeMethod, 'S256');
    await auth.close();
    auth = createAuth(f.config, { createClient: f.createClient });
    assert.equal(await auth.getAccessToken(), 'fixture-access-token');
    assert.equal(f.calls.silent!.account.homeAccountId, account.homeAccountId);
    assert.deepEqual(await auth.status(), { authenticated: true, loginPending: false });
  } finally { await auth.close(); await f.cleanup(); }
});
