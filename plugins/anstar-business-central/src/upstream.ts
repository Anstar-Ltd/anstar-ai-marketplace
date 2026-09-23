import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ToolResult } from './policy.ts';

const ALLOWED = new Set(['bc_actions_search', 'bc_actions_describe', 'bc_actions_invoke']);
export class BcClient {
  private client?: Client;
  private connecting?: Promise<Client>;
  private connectingClient?: Client;
  private closed = false;
  private readonly shutdown = new AbortController();
  constructor(private readonly transportFetch: typeof fetch) {}

  private async connect(): Promise<Client> {
    if (this.closed) throw new Error('Business Central connection is closed.');
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const client = new Client({ name: 'anstar-business-central-readonly', version: '0.3.0-preview.2' }, { capabilities: {} });
      const transport = new StreamableHTTPClientTransport(new URL('https://mcp.businesscentral.dynamics.com'), {
        fetch: async (input, init) => {
          if (this.closed) throw new Error('Business Central connection is closed.');
          return this.transportFetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal,this.shutdown.signal]) : this.shutdown.signal });
        },
        reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
      });
      client.onerror = () => { /* Errors are returned through the bounded request path, never logged with data. */ };
      this.connectingClient = client;
      try {
        await client.connect(transport, { timeout: 60000 });
        if (this.closed) throw new Error('Business Central connection is closed.');
        const found = new Set<string>();
        let cursor: string | undefined;
        const cursors = new Set<string>();
        do {
          const page = await client.listTools(cursor ? { cursor } : {}, { timeout: 60000 });
          for (const tool of page.tools) if (ALLOWED.has(tool.name)) found.add(tool.name);
          cursor = page.nextCursor;
          if (cursor) {
            if (cursors.has(cursor) || cursors.size >= 10) throw new Error('MCP discovery pagination refused.');
            cursors.add(cursor);
          }
        } while (cursor);
        if (found.size !== ALLOWED.size) throw new Error('Required BC discovery tools are missing.');
        if (this.closed) throw new Error('Business Central connection is closed.');
        this.client = client;
        return client;
      } catch (error) {
        await client.close().catch(() => undefined);
        throw error;
      }
    })();
    try { return await this.connecting; } finally { this.connecting = undefined; this.connectingClient = undefined; }
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!ALLOWED.has(name)) throw new Error('Only approved BC dispatchers may be called.');
    const client = await this.connect();
    try {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
      if (!Array.isArray(result.content)) throw new Error('Unsupported Business Central response.');
      return result as ToolResult;
    } catch (error) {
      this.client = undefined;
      await client.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.shutdown.abort();
    const client = this.client;
    this.client = undefined;
    await Promise.allSettled([client?.close(),this.connectingClient?.close()]);
  }
}
