import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createAdapterServer } from '../src/adapter.ts';

test('MCP initialization works without auth and exposes only narrow tools', async () => {
  let logins = 0, calls = 0;
  const server = createAdapterServer({
    call: async () => { calls++; return {content:[]}; },
    status: async () => ({authenticated:false,loginPending:false}),
    login: async () => {logins++; return {authorizationUrl:'https://login.microsoftonline.com/fixture',expiresInSeconds:300};},
  });
  const client = new Client({name:'test',version:'1'});
  const [local, remote] = InMemoryTransport.createLinkedPair();
  await server.connect(remote); await client.connect(local);
  const list = await client.listTools();
  assert.deepEqual(list.tools.map(t => t.name).sort(), ['bc_actions_describe','bc_actions_invoke','bc_actions_search','bc_connect','bc_status']);
  assert.equal(logins,0); assert.equal(calls,0);
  const denied = await client.callTool({name:'create_item',arguments:{}});
  assert.equal(denied.isError,true); assert.equal(calls,0);
  const connected = await client.callTool({name:'bc_connect',arguments:{}});
  assert.equal(connected.isError,undefined); assert.equal(logins,1);
  await client.close(); await server.close();
});

test('first unauthenticated read returns a sign-in link without business calls', async()=>{
  let authenticated=false,logins=0,calls=0;
  const server=createAdapterServer({
    status:async()=>({authenticated,loginPending:false}),
    login:async()=>{logins++;return {authorizationUrl:'https://login.microsoftonline.com/fixture',expiresInSeconds:600};},
    call:async()=>{calls++;return {content:[]};},
  });
  const client=new Client({name:'first-use',version:'1'});
  const [local,remote]=InMemoryTransport.createLinkedPair();
  try {
    await server.connect(remote);await client.connect(local);
    const result=await client.callTool({name:'bc_actions_search',arguments:{SearchText:'Items',SearchMode:'keyword',ActionType:['List']}});
    const data=JSON.parse((result.content as Array<{text:string}>)[0].text);
    assert.equal(data.authenticationRequired,true);assert.equal(data.authorizationUrl,'https://login.microsoftonline.com/fixture');
    assert.equal(logins,1);assert.equal(calls,0);
    authenticated=true;
    await client.callTool({name:'bc_actions_search',arguments:{SearchText:'Items',SearchMode:'keyword',ActionType:['List']}});
    assert.equal(logins,1);assert.equal(calls,1);
  } finally {await client.close();await server.close();}
});
