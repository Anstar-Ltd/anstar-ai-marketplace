import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodError } from 'zod';
import { PolicyError, type ToolResult } from './policy.ts';
import { NetworkBoundaryError } from './network.ts';

export interface AdapterHandlers {
  call(name: string, args: unknown): Promise<ToolResult>;
  status(): Promise<{ authenticated: boolean; loginPending: boolean }>;
  login(): Promise<{ authorizationUrl: string; expiresInSeconds: number }>;
}
const empty = { type: 'object' as const, properties: {}, additionalProperties: false };
const action = { type: 'string', pattern: '^List_[A-Za-z0-9_]+_(PAG|QRY)[0-9]+$', maxLength: 180 };
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
export const TOOLS: Tool[] = [
  { name: 'bc_connect', description: 'Start personal Microsoft sign-in. Open the returned URL on this computer; then check bc_status. No BC records are changed.', inputSchema: empty, annotations: { ...annotations, readOnlyHint: false, idempotentHint: false } },
  { name: 'bc_status', description: 'Check local Microsoft sign-in status without reading Business Central records.', inputSchema: empty, annotations },
  { name: 'bc_actions_search', description: 'Discover Business Central read actions by non-empty keywords. Only List operations are permitted; results are bounded.', inputSchema: { type: 'object', additionalProperties: false, required: ['SearchText', 'SearchMode', 'ActionType'], properties: { SearchText: { type: 'string', minLength: 1, maxLength: 250 }, SearchMode: { const: 'keyword' }, ActionType: { type: 'array', items: { const: 'List' }, minItems: 1, maxItems: 1 }, Top: { type: 'integer', minimum: 5, maximum: 50, default: 10 } } }, annotations },
  { name: 'bc_actions_describe', description: 'Describe an exact List action returned by search in this session; required before invoking it.', inputSchema: { type: 'object', additionalProperties: false, required: ['ActionName'], properties: { ActionName: action } }, annotations },
  { name: 'bc_actions_invoke', description: 'Read using an action searched and described this session. RequestParameters is JSON with explicit select, top 1–100, optional filter/orderby/skip. Only text results; no writes or bound actions.', inputSchema: { type: 'object', additionalProperties: false, required: ['ActionName', 'RequestParameters'], properties: { ActionName: action, RequestParameters: { type: 'string', maxLength: 8192 } } }, annotations },
];

export function createAdapterServer(handlers: AdapterHandlers): Server {
  const server = new Server({ name: 'anstar-business-central', version: '0.3.0-preview.1' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const { name, arguments: args = {} } = request.params;
      if (name === 'bc_connect' || name === 'bc_status') {
        z.object({}).strict().parse(args);
        const value = name === 'bc_connect' ? await handlers.login() : await handlers.status();
        return { content: [{ type: 'text', text: JSON.stringify(value) }] };
      }
      if (!TOOLS.some(t => t.name === name)) throw new PolicyError('Unknown tool; only approved read dispatchers are available.');
      if (!(await handlers.status()).authenticated) {
        const login = await handlers.login();
        return { content: [{ type: 'text', text: JSON.stringify({ authenticationRequired: true, ...login, nextStep: 'Present this Microsoft sign-in link to the user. They must open it on this computer. Wait for completion, check bc_status, then retry the original read. No Business Central records were accessed.' }) }] };
      }
      return await handlers.call(name, args) as CallToolResult;
    } catch (error) {
      let message = 'Business Central request failed. Check sign-in and the configured read-only environment; no fallback was attempted.';
      if (error instanceof ZodError) message = 'Invalid arguments. Use the exact tool schema and bounded read parameters.';
      else if (error instanceof PolicyError || error instanceof NetworkBoundaryError) message = error.message;
      else if (error instanceof Error && error.name === 'AuthRequiredError') message = 'Microsoft sign-in required. Call bc_connect, complete sign-in, then retry.';
      return { isError: true, content: [{ type: 'text', text: message }] };
    }
  });
  return server;
}
