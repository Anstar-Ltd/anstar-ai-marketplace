import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAdapterServer } from './adapter.ts';
import { createAuth } from './auth.ts';
import { authDirectory, encodeHeader, loadConnection } from './config.ts';
import { createBcFetch } from './network.ts';
import { ReadPolicy } from './policy.ts';
import { BcClient } from './upstream.ts';

async function main(): Promise<void> {
  process.umask(0o077);
  const connection = await loadConnection();
  const auth = createAuth({ ...connection, cacheDirectory: authDirectory(connection) });
  const upstream = new BcClient(createBcFetch({ endpoint: connection.endpoint, getAccessToken: () => auth.getAccessToken(), headers: {
    TenantId: connection.tenantId, EnvironmentName: connection.environment,
    Company: encodeHeader(connection.company), ConfigurationName: encodeHeader(connection.configuration),
  } }));
  const policy = new ReadPolicy((name, args) => upstream.call(name, args));
  const server = createAdapterServer({ call: (name, args) => policy.call(name, args), login: () => auth.beginLogin(), status: () => auth.status() });
  const transport = new StdioServerTransport();
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await Promise.allSettled([server.close(), upstream.close(), auth.close()]);
  };
  server.onclose = () => { void close(); };
  process.stdin.once('end', () => { void close(); });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void close(); });
  await server.connect(transport);
}
main().catch(() => { process.stderr.write('Business Central adapter startup failed; verify Node.js and plugin configuration.\n'); process.exitCode = 1; });
