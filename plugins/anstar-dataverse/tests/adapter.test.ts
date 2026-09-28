import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAdapterServer } from '../src/adapter.ts';
import type { AuthProvider } from '../src/auth.ts';
import type { DataverseClient } from '../src/upstream.ts';

test('local adapter exposes only connection and bounded read dispatchers', async () => {
  const auth: AuthProvider = {
    getAccessToken: async () => 'test',
    beginLogin: async () => ({ verificationUri: 'https://microsoft.com/devicelogin', userCode: 'TEST', expiresInSeconds: 600 }),
    status: async () => ({ authenticated: true, loginPending: false }),
  };
  const calls: string[] = [];
  const upstream = {
    tools: async () => [{ name: 'search', inputSchema: { type: 'object', properties: {} } }],
    call: async (name: string) => { calls.push(name); return { content: [{ type: 'text', text: 'ok' }] }; },
  } as unknown as DataverseClient;
  const server = createAdapterServer(auth, upstream);
  const client = new Client({ name: 'test', version: '1' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    assert.deepEqual((await client.listTools()).tools.map(t => t.name), ['dv_status', 'dv_connect', 'dv_tools', 'dv_call']);
    const denied = await client.callTool({ name: 'dv_call', arguments: { name: 'delete', arguments: {} } });
    assert.equal(denied.isError, true);
    const unbounded = await client.callTool({ name: 'dv_call', arguments: { name: 'read_query', arguments: { query: 'SELECT * FROM account' } } });
    assert.equal(unbounded.isError, true);
    const allowed = await client.callTool({ name: 'dv_call', arguments: { name: 'search', arguments: { query: 'account' } } });
    assert.equal(allowed.isError, undefined);
    assert.deepEqual(calls, ['search']);
  } finally { await Promise.all([client.close(), server.close()]); }
});

test('first attempted read starts sign-in and returns a link and code', async () => {
  let loginCalls = 0;
  const auth: AuthProvider = {
    getAccessToken: async () => { throw new Error('not signed in'); },
    beginLogin: async () => { loginCalls++; return { verificationUri: 'https://login.microsoft.com/device', userCode: 'TESTCODE', expiresInSeconds: 900 }; },
    status: async () => ({ authenticated: false, loginPending: loginCalls > 0 }),
  };
  const upstream = { tools: async () => { throw new Error('should not connect'); } } as unknown as DataverseClient;
  const server = createAdapterServer(auth, upstream);
  const client = new Client({ name: 'first-use-test', version: '1' }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = await client.callTool({ name: 'dv_tools', arguments: {} });
    assert.equal(result.isError, undefined);
    const content = result.content as Array<{ type: string; text: string }>;
    assert.equal(content[0]?.type, 'text');
    const body = JSON.parse(content[0].text);
    assert.equal(body.authenticationRequired, true);
    assert.equal(body.verificationUri, 'https://login.microsoft.com/device');
    assert.equal(body.userCode, 'TESTCODE');
    assert.equal(loginCalls, 1);
  } finally { await Promise.all([client.close(), server.close()]); }
});
