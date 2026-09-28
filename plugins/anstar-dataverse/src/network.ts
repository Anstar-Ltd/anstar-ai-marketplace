import type { Connection } from './config.ts';

export class NetworkBoundaryError extends Error {}
export function createDataverseFetch(connection: Connection, getAccessToken: () => Promise<string>, raw: typeof fetch = fetch): typeof fetch {
  const target = new URL(connection.endpoint);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href !== target.href || url.username || url.password || url.hash) throw new NetworkBoundaryError('Unexpected Dataverse destination refused.');
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['GET', 'POST', 'DELETE'].includes(method)) throw new NetworkBoundaryError('Unexpected Dataverse HTTP method refused.');
    // DELETE is used only by MCP session teardown. The adapter exposes no write tool.
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
    let response: Response;
    try {
      response = await raw(target, { ...init, method, headers, redirect: 'error', signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(125000)]) : AbortSignal.timeout(125000) });
    } catch { throw new NetworkBoundaryError('Dataverse network request failed or timed out.'); }
    if (response.status >= 300 && response.status < 400) throw new NetworkBoundaryError('Dataverse redirect refused.');
    if (!response.body) return response;
    const reader = response.body.getReader();
    let bytes = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) { controller.close(); return; }
          bytes += next.value.byteLength;
          if (bytes > 2 * 1024 * 1024) { await reader.cancel(); controller.error(new NetworkBoundaryError('Dataverse response exceeded the byte limit.')); return; }
          controller.enqueue(next.value);
        } catch { controller.error(new NetworkBoundaryError('Dataverse response stream failed.')); }
      },
      async cancel() { await reader.cancel(); },
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
