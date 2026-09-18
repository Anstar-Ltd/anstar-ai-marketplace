import assert from 'node:assert/strict';
import test from 'node:test';
import { createBcFetch } from '../src/network.ts';

const endpoint = 'https://mcp.businesscentral.dynamics.com';
test('pins destination and attaches only adapter credentials and routing headers', async () => {
  let sent: Request | undefined;
  const fetcher = createBcFetch({endpoint,headers:{TenantId:'fixture',EnvironmentName:'sandbox',Company:'Fixture Ltd',ConfigurationName:'Read Only'},getAccessToken:async ()=>'fixture-token',fetchImpl:async (url,init) => {sent=new Request(url,init);return new Response('{}',{headers:{'content-type':'application/json'}});}});
  await fetcher(endpoint,{method:'POST',headers:{Authorization:'bad',TenantId:'other'},body:'{}'});
  assert.equal(sent?.headers.get('authorization'),'Bearer fixture-token');
  assert.equal(sent?.headers.get('tenantid'),'fixture');
  assert.equal(sent?.redirect,'error');
  await assert.rejects(fetcher('https://attacker.invalid/',{method:'POST'}),/destination/i);
  await assert.rejects(fetcher(endpoint+'/other',{method:'POST'}),/destination/i);
  await assert.rejects(fetcher(endpoint,{method:'DELETE'}),/method/i);
});

test('bounds response bytes and rejects redirects without forwarding', async () => {
  const options={endpoint,headers:{},getAccessToken:async ()=>'fixture-token',maxBytes:8};
  const large=createBcFetch({...options,fetchImpl:async()=>new Response('0123456789')});
  const response=await large(endpoint,{method:'POST',body:'{}'});
  await assert.rejects(response.text(),/limit/i);
  const redirect=createBcFetch({...options,fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://attacker.invalid'}})});
  await assert.rejects(redirect(endpoint),/redirect/i);
});
