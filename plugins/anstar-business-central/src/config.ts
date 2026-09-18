import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const routing = z.string().min(1).max(150).refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Invalid routing value');
const schema = z.object({
  tenantId: z.literal('8f0da656-9ff9-4e19-97a2-79388929de03'),
  clientId: z.literal('894473ac-0b35-44de-97f8-c642366fdb43'),
  scope: z.literal('https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All'),
  redirectUri: z.literal('http://localhost:33418/callback/GNmTSc-BOPT4'),
  endpoint: z.literal('https://mcp.businesscentral.dynamics.com'),
  environment: z.literal('sandbox-uat-2026-march'),
  environmentType: z.literal('Sandbox'), company: z.literal('Anstar Ltd'), configuration: z.literal('Anstar AI Read Only'),
}).strict();
export type Connection = z.infer<typeof schema>;
export function validateConnection(value: unknown): Connection { return schema.parse(value); }
export async function loadConnection(): Promise<Connection> {
  return validateConnection(JSON.parse(await readFile(new URL('../connection.json', import.meta.url), 'utf8')));
}
export function encodeHeader(value: string): string {
  routing.parse(value);
  return /^[\x20-\x7e]+$/.test(value) ? value : `=?base64?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}
export function privateBaseDirectory(): string {
  // Deliberately not XDG/OneDrive/cloud-synced configuration or plugin cache.
  const home = os.homedir();
  return process.platform === 'win32'
    ? path.join(home, 'AppData', 'Local', 'Anstar', 'anstar-business-central')
    : path.join(home, '.local', 'state', 'anstar-business-central');
}
export function authDirectory(connection: Connection): string {
  const identity = createHash('sha256').update(JSON.stringify(connection)).digest('hex');
  return path.join(privateBaseDirectory(), 'auth', identity);
}
