import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConnection } from '../src/config.ts';
import { createDataverseFetch, NetworkBoundaryError } from '../src/network.ts';

const connection = validateConnection({
  tenantId: '8f0da656-9ff9-4e19-97a2-79388929de03',
  clientId: '65649345-8fb7-477a-820b-5604b5e2afe3',
  scope: 'https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools',
  endpoint: 'https://anstar-prod.crm11.dynamics.com/api/mcp',
});

test('fixed endpoint receives bearer token and other destinations are refused', async () => {
  const fetcher = createDataverseFetch(connection, async () => 'test-token', async (input, init) => {
    assert.equal(String(input), connection.endpoint);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-token');
    return new Response('ok');
  });
  assert.equal(await (await fetcher(connection.endpoint, { method: 'POST' })).text(), 'ok');
  await assert.rejects(() => fetcher('https://example.org/mcp'), NetworkBoundaryError);
  await assert.rejects(() => fetcher(connection.endpoint, { method: 'PUT' }), NetworkBoundaryError);
});

test('connection pin rejects a changed Dataverse endpoint', () => {
  assert.throws(() => validateConnection({ ...connection, endpoint: 'https://example.org/mcp' }));
});
