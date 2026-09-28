import { createHash } from 'node:crypto';
import { PublicClientApplication, type AuthenticationResult } from '@azure/msal-node';
import { AuthStore } from './auth-store.ts';
import type { Connection } from './config.ts';

export class AuthRequiredError extends Error {
  constructor() { super('Microsoft sign-in required.'); this.name = 'AuthRequiredError'; }
}
export interface DeviceLogin { verificationUri: string; userCode: string; expiresInSeconds: number }
export interface AuthProvider {
  getAccessToken(): Promise<string>;
  beginLogin(): Promise<DeviceLogin>;
  status(): Promise<{ authenticated: boolean; loginPending: boolean }>;
}

export function createAuth(connection: Connection, cacheDirectory: string): AuthProvider {
  const authority = `https://login.microsoftonline.com/${connection.tenantId}`;
  const scopes = [connection.scope];
  const store = new AuthStore(cacheDirectory, createHash('sha256').update(JSON.stringify(connection)).digest('hex'));
  const client = new PublicClientApplication({
    auth: { clientId: connection.clientId, authority },
    system: { loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => {} } },
  });
  let pending: { details: DeviceLogin; expiresAt: number; operation: Promise<void> } | undefined;
  let starting: Promise<DeviceLogin> | undefined;

  function valid(result: AuthenticationResult | null): result is AuthenticationResult {
    return !!result?.accessToken && !!result.account?.homeAccountId &&
      result.tenantId?.toLowerCase() === connection.tenantId.toLowerCase() &&
      result.account.tenantId?.toLowerCase() === connection.tenantId.toLowerCase();
  }
  async function getAccessToken(): Promise<string> {
    try {
      const token = await store.transaction(async state => {
        if (!state.selectedHomeAccountId) return null;
        if (state.cache) client.getTokenCache().deserialize(state.cache);
        const account = (await client.getAllAccounts()).find(a => a.homeAccountId === state.selectedHomeAccountId && a.tenantId.toLowerCase() === connection.tenantId.toLowerCase());
        if (!account) return null;
        const result = await client.acquireTokenSilent({ scopes, account, authority });
        if (!valid(result)) return null;
        state.cache = client.getTokenCache().serialize();
        return result.accessToken;
      });
      if (!token) throw new AuthRequiredError();
      return token;
    } catch { throw new AuthRequiredError(); }
  }
  async function beginLogin(): Promise<DeviceLogin> {
    if (pending && pending.expiresAt > Date.now()) return pending.details;
    if (pending) throw new Error('A Microsoft sign-in is still pending.');
    if (starting) return starting;
    let resolveCode!: (value: DeviceLogin) => void;
    let rejectCode!: (error: Error) => void;
    const code = new Promise<DeviceLogin>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
    starting = code;
    let codeDelivered = false;
    const operation = (async () => {
      try {
        const result = await client.acquireTokenByDeviceCode({
          scopes,
          authority,
          deviceCodeCallback: response => {
            if (codeDelivered) return;
            codeDelivered = true;
            const destination = new URL(response.verificationUri);
            const approved = (['microsoft.com', 'www.microsoft.com'].includes(destination.hostname) && ['/devicelogin', '/devicelogin/'].includes(destination.pathname)) ||
              (destination.hostname === 'login.microsoft.com' && destination.pathname === '/device');
            if (destination.protocol !== 'https:' || !approved || destination.username || destination.password || destination.hash) {
              rejectCode(Object.assign(new Error('Unexpected Microsoft verification destination.'), { errorCode: 'unexpected_verification_uri' }));
              return;
            }
            const details = { verificationUri: response.verificationUri, userCode: response.userCode, expiresInSeconds: Math.min(response.expiresIn, 900) };
            pending = { details, expiresAt: Date.now() + details.expiresInSeconds * 1000, operation };
            resolveCode(details);
          },
        });
        if (!valid(result)) throw new AuthRequiredError();
        await store.transaction(async state => {
          state.cache = client.getTokenCache().serialize();
          state.selectedHomeAccountId = result.account!.homeAccountId;
        });
      } catch (error) {
        if (!codeDelivered) {
          const code = error && typeof error === 'object' && 'errorCode' in error && typeof error.errorCode === 'string' ? error.errorCode : 'unknown';
          rejectCode(Object.assign(new Error('Microsoft device sign-in could not be started.'), { errorCode: code }));
        }
      } finally { pending = undefined; }
    })();
    void operation.catch(() => undefined);
    try { return await code; } finally { starting = undefined; }
  }
  return {
    getAccessToken, beginLogin,
    async status() {
      try { await getAccessToken(); return { authenticated: true, loginPending: !!pending }; }
      catch { return { authenticated: false, loginPending: !!pending }; }
    },
  };
}
