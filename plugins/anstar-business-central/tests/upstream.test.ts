import assert from 'node:assert/strict';
import test from 'node:test';
import { BcClient } from '../src/upstream.ts';

test('SDK handshake and tool discovery use pinned HTTP and exact dispatchers', async () => {
  const methods: string[] = [];
  const tools=['bc_actions_search','bc_actions_describe','bc_actions_invoke'];
  const transportFetch: typeof fetch = async (_url, init) => {
    if(init?.method==='GET') return new Response(null,{status:405});
    const msg=JSON.parse(String(init?.body)); methods.push(msg.method);
    if(msg.id===undefined) return new Response(null,{status:202});
    const result=msg.method==='initialize'
      ? {protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}
      : msg.method==='tools/list'
        ? {tools:tools.map(name=>({name,inputSchema:{type:'object'}}))}
        : {content:[{type:'text',text:'fixture result'}]};
    return new Response(JSON.stringify({jsonrpc:'2.0',id:msg.id,result}),{headers:{'content-type':'application/json'}});
  };
  const bc=new BcClient(transportFetch);
  const result=await bc.call('bc_actions_search',{SearchText:'item'});
  assert.equal(result.content[0].text,'fixture result');
  assert.deepEqual(methods,['initialize','notifications/initialized','tools/list','tools/call']);
  await assert.rejects(bc.call('create_item',{}),/approved/i);
  await bc.close();
});

test('close during initialization prevents later discovery and invocation', async()=>{
  let release!:()=>void,entered!:()=>void;
  const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
  const methods:string[]=[];
  const bc=new BcClient(async(_url,init)=>{
    if(init?.method==='GET')return new Response(null,{status:405});
    const m=JSON.parse(String(init?.body));methods.push(m.method);
    if(m.method==='initialize'){entered();await gate;return Response.json({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}});}
    if(m.id===undefined)return new Response(null,{status:202});
    return Response.json({jsonrpc:'2.0',id:m.id,result:m.method==='tools/list'?{tools:['bc_actions_search','bc_actions_describe','bc_actions_invoke'].map(name=>({name,inputSchema:{type:'object'}}))}:{content:[]}});
  });
  const operation=bc.call('bc_actions_search',{});const outcome=operation.then(()=>false,()=>true);
  await started;await bc.close();release();
  assert.equal(await outcome,true);assert.deepEqual(methods,['initialize']);
  await assert.rejects(bc.call('bc_actions_search',{}),/closed/i);
});
