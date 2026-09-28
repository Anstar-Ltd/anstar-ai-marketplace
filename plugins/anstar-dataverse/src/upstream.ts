import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Connection } from './config.ts';

export const ALLOWED = new Set(['search', 'search_data', 'describe', 'read_query']);
const REQUIRED = new Set(['search', 'describe', 'read_query']);
export class DataverseClient {
  private client?: Client;
  private connecting?: Promise<Client>;
  constructor(private readonly connection: Connection, private readonly transportFetch: typeof fetch) {}
  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const client = new Client({ name: 'anstar-dataverse-readonly', version: '0.2.0-preview.1' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(new URL(this.connection.endpoint), { fetch: this.transportFetch, reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 } });
      client.onerror = () => {};
      try { await client.connect(transport, { timeout: 60000 }); this.client = client; return client; }
      catch (error) { await client.close().catch(() => undefined); throw error; }
    })();
    try { return await this.connecting; } finally { this.connecting = undefined; }
  }
  async tools(): Promise<Tool[]> {
    const client = await this.connect();
    const found = new Map<string, Tool>();
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const page = await client.listTools(cursor ? { cursor } : {}, { timeout: 60000 });
      for (const tool of page.tools) if (ALLOWED.has(tool.name)) found.set(tool.name, tool);
      cursor = page.nextCursor;
      if (cursor) { if (seen.has(cursor) || seen.size >= 10) throw new Error('Dataverse tool pagination refused.'); seen.add(cursor); }
    } while (cursor);
    if ([...REQUIRED].some(name => !found.has(name))) throw new Error('A required Dataverse read tool is unavailable.');
    return [...found.values()];
  }
  async call(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    if (!ALLOWED.has(name)) throw new Error('Only the four approved Dataverse read tools may be called.');
    if (!(await this.tools()).some(tool => tool.name === name)) throw new Error('This Dataverse read tool is not enabled in the environment.');
    const client = await this.connect();
    try { return await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 }) as CallToolResult; }
    catch (error) { this.client = undefined; await client.close().catch(() => undefined); throw error; }
  }
  async close(): Promise<void> { const client = this.client; this.client = undefined; await client?.close(); }
}
