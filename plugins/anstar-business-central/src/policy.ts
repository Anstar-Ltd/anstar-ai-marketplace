import { z } from 'zod';

export interface ToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  [key: string]: unknown;
}
export type RemoteCall = (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
export class PolicyError extends Error {}
const actionName = z.string().max(180).regex(/^List_[A-Za-z0-9_]+_(?:PAG|QRY)[0-9]+$/);
const searchArgs = z.object({
  SearchText: z.string().trim().min(1).max(250), SearchMode: z.literal('keyword'),
  ActionType: z.tuple([z.literal('List')]), Top: z.number().int().min(5).max(50).default(10),
}).strict();
const describeArgs = z.object({ ActionName: actionName }).strict();
const invokeArgs = z.object({ ActionName: actionName, RequestParameters: z.string().max(8192) }).strict();
const readParameters = z.object({
  select: z.string().min(1).max(1500), top: z.number().int().min(1).max(100).default(10),
  skip: z.number().int().min(0).max(100000).optional(), filter: z.string().max(2000).optional(),
  orderby: z.string().max(500).optional(), resultFormat: z.literal('text').default('text'),
}).strict();
interface Description { fields: Set<string>; properties: Set<string>; }

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function embedded(result: ToolResult, opening: '[' | '{'): unknown {
  if (result.isError) throw new PolicyError('Business Central discovery returned an error; no action authorized.');
  const closing = opening === '[' ? ']' : '}';
  for (const part of result.content) {
    if (part.type !== 'text' || typeof part.text !== 'string') continue;
    const start = part.text.indexOf(opening), end = part.text.lastIndexOf(closing);
    if (start < 0 || end < start) continue;
    try { return JSON.parse(part.text.slice(start, end + 1)); } catch { /* Another text block may carry the schema. */ }
  }
  throw new PolicyError('Business Central returned an unsupported discovery format; refusing to infer an action.');
}

/** Local guard in addition to, not instead of, the BC read-only configuration. */
export class ReadPolicy {
  private readonly discovered = new Set<string>();
  private readonly described = new Map<string, Description>();
  constructor(private readonly remote: RemoteCall) {}

  async call(name: string, input: unknown): Promise<ToolResult> {
    if (name === 'bc_actions_search') {
      const args = searchArgs.parse(input);
      const result = await this.remote(name, args);
      if (result.isError) return result;
      // The upstream emits a plain sentence for no matches, not an empty JSON list.
      if (result.content.some(c => c.type === 'text' && c.text?.startsWith('No matching Business Central actions found.'))) return result;
      const names = z.array(actionName).max(50).parse(embedded(result, '['));
      if (this.discovered.size + names.length > 2000) throw new PolicyError('Discovery limit reached; start a new session.');
      for (const action of names) this.discovered.add(action);
      return result;
    }
    if (name === 'bc_actions_describe') {
      const args = describeArgs.parse(input);
      if (!this.discovered.has(args.ActionName)) throw new PolicyError('Discover this List action with bc_actions_search first.');
      this.described.delete(args.ActionName);
      const result = await this.remote(name, args);
      if (result.isError) return result;
      const data = embedded(result, '{');
      if (!object(data) || data.name !== args.ActionName || !object(data.schema) || data.schema.type !== 'object' || !object(data.schema.properties)) {
        throw new PolicyError('Description does not match the selected List action.');
      }
      const properties = data.schema.properties;
      const available = properties._availableFields;
      if (!object(available) || available.readOnly !== true || typeof available.description !== 'string' || !properties.select || !properties.top) {
        throw new PolicyError('List action lacks the expected bounded-read schema.');
      }
      const fields = new Set([...available.description.matchAll(/(?:Available fields: |, )([A-Za-z][A-Za-z0-9_]*) \[/g)].map(m => m[1]));
      if (!fields.size) throw new PolicyError('Could not establish the available fields.');
      this.described.set(args.ActionName, { fields, properties: new Set(Object.keys(properties)) });
      return result;
    }
    if (name === 'bc_actions_invoke') {
      const args = invokeArgs.parse(input);
      if (!this.discovered.has(args.ActionName)) throw new PolicyError('Discover this List action first.');
      const schema = this.described.get(args.ActionName);
      if (!schema) throw new PolicyError('Describe this List action first.');
      let parsed: unknown;
      try { parsed = JSON.parse(args.RequestParameters); } catch { throw new PolicyError('RequestParameters must be a JSON object.'); }
      const parameters = readParameters.parse(parsed);
      for (const key of Object.keys(parameters)) {
        if (!schema.properties.has(key)) throw new PolicyError('Unsupported parameter in discovered read schema.');
      }
      const selected = parameters.select.split(',').map(s => s.trim());
      if (!selected.length || selected.some(field => !schema.fields.has(field))) throw new PolicyError('select must contain only fields from the described schema.');
      parameters.select = selected.join(',');
      return this.remote(name, { ActionName: args.ActionName, RequestParameters: JSON.stringify(parameters) });
    }
    throw new PolicyError('Only the three approved BC read dispatchers are available.');
  }
}
