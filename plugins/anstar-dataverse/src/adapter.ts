import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { AuthProvider } from './auth.ts';
import type { DataverseClient } from './upstream.ts';
import { ALLOWED } from './upstream.ts';

const empty = { type: 'object' as const, properties: {}, additionalProperties: false };
const read = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
export const TOOLS: Tool[] = [
  { name: 'dv_status', description: 'Check local Microsoft sign-in status. No Dataverse records are read.', inputSchema: empty, annotations: read },
  { name: 'dv_connect', description: 'Start personal Microsoft device sign-in and return a verification URL and code. No Dataverse records are changed.', inputSchema: empty, annotations: { ...read, readOnlyHint: false, idempotentHint: false } },
  { name: 'dv_tools', description: 'Return schemas for the four approved Dataverse read tools: search, search_data, describe and read_query. Requires sign-in.', inputSchema: empty, annotations: read },
  { name: 'dv_call', description: 'Call one approved Dataverse read tool using its exact schema from dv_tools. Keep results bounded; never use SELECT *, broad personal-data fields or mutation queries.', inputSchema: { type: 'object', additionalProperties: false, required: ['name', 'arguments'], properties: { name: { type: 'string', enum: [...ALLOWED] }, arguments: { type: 'object', additionalProperties: true } } }, annotations: read },
];

export function createAdapterServer(auth: AuthProvider, upstream: DataverseClient): Server {
  const server = new Server({ name: 'anstar-dataverse', version: '0.2.0-preview.1' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const { name, arguments: args = {} } = request.params;
      if (name === 'dv_connect' || name === 'dv_status' || name === 'dv_tools') z.object({}).strict().parse(args);
      if (name === 'dv_status') return { content: [{ type: 'text', text: JSON.stringify(await auth.status()) }] };
      if (name === 'dv_connect') return { content: [{ type: 'text', text: JSON.stringify(await auth.beginLogin()) }] };
      if (name !== 'dv_tools' && name !== 'dv_call') throw new Error('Unknown tool.');
      const call = name === 'dv_call' ? z.object({ name: z.enum(['search', 'search_data', 'describe', 'read_query']), arguments: z.record(z.unknown()) }).strict().parse(args) : undefined;
      if (!(await auth.status()).authenticated) {
        const login = await auth.beginLogin();
        return { content: [{ type: 'text', text: JSON.stringify({ authenticationRequired: true, ...login, nextStep: 'Show this Microsoft verification URL and code to the user. Ask them to complete sign-in, then retry the Dataverse read.' }) }] };
      }
      if (name === 'dv_tools') return { content: [{ type: 'text', text: JSON.stringify(await upstream.tools()) }] };
      const encoded = JSON.stringify(call!.arguments);
      if (Buffer.byteLength(encoded) > 8192 || /\bSELECT\s+\*/i.test(encoded)) throw new Error('Unbounded or oversized Dataverse request refused.');
      const result = await upstream.call(call!.name, call!.arguments);
      if (!Array.isArray(result.content) || result.content.some(item => item.type !== 'text')) throw new Error('Unsupported Dataverse response type.');
      return result as CallToolResult;
    } catch {
      return { isError: true, content: [{ type: 'text', text: 'Dataverse request failed. Check the exact tool schema, sign-in and read-only scope. No fallback or write was attempted.' }] };
    }
  });
  return server;
}
