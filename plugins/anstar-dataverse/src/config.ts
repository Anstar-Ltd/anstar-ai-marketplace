import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const schema = z.object({
  tenantId: z.literal('8f0da656-9ff9-4e19-97a2-79388929de03'),
  clientId: z.literal('65649345-8fb7-477a-820b-5604b5e2afe3'),
  scope: z.literal('https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools'),
  endpoint: z.literal('https://anstar-prod.crm11.dynamics.com/api/mcp'),
}).strict();
export type Connection = z.infer<typeof schema>;
export function validateConnection(value: unknown): Connection { return schema.parse(value); }
export async function loadConnection(): Promise<Connection> {
  return validateConnection(JSON.parse(await readFile(new URL('../connection.json', import.meta.url), 'utf8')));
}
export function authDirectory(connection: Connection): string {
  const identity = createHash('sha256').update(JSON.stringify(connection)).digest('hex');
  return path.join(os.homedir(), '.local', 'state', 'anstar-dataverse', 'auth', identity);
}
