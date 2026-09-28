import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('real stdio entrypoint lists only four local tools before sign-in', async () => {
  const client = new Client({ name: 'dataverse-entry-test', version: '1' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'src/server.ts'], cwd: fileURLToPath(new URL('..', import.meta.url)), stderr: 'pipe' });
  let errors = '';
  transport.stderr?.on('data', chunk => { errors += String(chunk); });
  try {
    await client.connect(transport, { timeout: 10000 });
    assert.deepEqual((await client.listTools()).tools.map(t => t.name), ['dv_status', 'dv_connect', 'dv_tools', 'dv_call']);
    assert.equal(errors, '');
  } finally { await client.close(); }
});
