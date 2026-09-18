import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('real stdio entrypoint discovers tools without OAuth or global Codex settings', async () => {
  const home = await mkdtemp(path.join(await realpath(os.tmpdir()), 'bc-entry-'));
  const client = new Client({name:'bc-entry-test',version:'1'});
  const transport = new StdioClientTransport({command:process.execPath,args:['--import','tsx','src/server.ts'],cwd:fileURLToPath(new URL('..',import.meta.url)),env:{PATH:process.env.PATH??'',HOME:home,USERPROFILE:home,SystemRoot:process.env.SystemRoot??'',LOCALAPPDATA:path.join(home,'AppData','Local')},stderr:'pipe'});
  let errors=''; transport.stderr?.on('data', chunk=> { errors+=String(chunk); });
  try {
    await client.connect(transport,{timeout:10000});
    const tools=await client.listTools();
    assert.equal(tools.tools.length,5);
    const status=await client.callTool({name:'bc_status',arguments:{}});
    assert.equal(status.isError,undefined, JSON.stringify(status));
    assert.deepEqual(JSON.parse((status.content as Array<{text:string}>)[0].text),{authenticated:false,loginPending:false});
    assert.equal(errors,'');
  } finally {await client.close();await rm(home,{recursive:true,force:true});}
});
