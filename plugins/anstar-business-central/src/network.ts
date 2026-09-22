export class NetworkBoundaryError extends Error {}
interface BcFetchOptions {
  endpoint: string;
  headers: Record<string, string>;
  getAccessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
}

/** Fixed Microsoft resource only. No OAuth discovery or redirects in this path. */
export function createBcFetch(options: BcFetchOptions): typeof fetch {
  const target = new URL(options.endpoint);
  if (target.href !== 'https://mcp.businesscentral.dynamics.com/') throw new NetworkBoundaryError('Unsupported BC destination.');
  const raw = options.fetchImpl ?? fetch;
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href !== target.href) throw new NetworkBoundaryError('Blocked unexpected BC destination.');
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && method !== 'POST') throw new NetworkBoundaryError('Blocked BC HTTP method.');
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    for (const [name, value] of Object.entries(options.headers)) headers.set(name, value);
    headers.set('Authorization', `Bearer ${await options.getAccessToken()}`);
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 125000);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    let response: Response;
    try { response = await raw(target, { ...init, method, headers, redirect: 'error', signal }); }
    catch { throw new NetworkBoundaryError('Business Central network request failed or timed out.'); }
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new NetworkBoundaryError('Business Central redirect refused.');
    }
    if (!response.body) return response;
    const reader = response.body.getReader();
    const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
    let bytes = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) { controller.close(); return; }
          bytes += next.value.byteLength;
          if (bytes > maxBytes) {
            await reader.cancel();
            controller.error(new NetworkBoundaryError('Business Central response exceeded the byte limit.'));
            return;
          }
          controller.enqueue(next.value);
        } catch { controller.error(new NetworkBoundaryError('Business Central response stream failed.')); }
      },
      async cancel() { await reader.cancel(); },
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
