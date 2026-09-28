import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAdapterServer } from './adapter.ts';
import { createAuth } from './auth.ts';
import { authDirectory, loadConnection } from './config.ts';
import { createDataverseFetch } from './network.ts';
import { DataverseClient } from './upstream.ts';

async function main(): Promise<void> {
  process.umask(0o077);
  const connection = await loadConnection();
  const auth = createAuth(connection, authDirectory(connection));
  const upstream = new DataverseClient(connection, createDataverseFetch(connection, () => auth.getAccessToken()));
  const server = createAdapterServer(auth, upstream);
  const close = async () => { await Promise.allSettled([server.close(), upstream.close()]); };
  process.stdin.once('end', () => { void close(); });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void close(); });
  await server.connect(new StdioServerTransport());
}
main().catch(() => { process.stderr.write('Dataverse adapter startup failed; verify Node.js and plugin configuration.\n'); process.exitCode = 1; });
