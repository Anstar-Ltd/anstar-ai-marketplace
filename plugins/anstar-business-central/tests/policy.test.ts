import assert from 'node:assert/strict';
import test from 'node:test';
import { ReadPolicy } from '../src/policy.ts';

const search = (names: string[]) => ({ content: [{ type: 'text', text: `Actions:\n${JSON.stringify(names)}` }] });
const described = (name: string) => ({ content: [{ type: 'text', text: `Schema:\n${JSON.stringify({ name, schema: { type: 'object', properties: { _availableFields: { readOnly: true, description: 'Available fields: id [string/uuid], number [string] (2 total).' }, select: { type: 'string' }, top: { type: 'number' }, skip: { type: 'number' }, filter: { type: 'string' }, resultFormat: { type: 'string', enum: ['text', 'resource'] } } } })}\nNote: use schema.` }] });

test('only discovered and described List actions can be invoked', async () => {
  const calls: Array<{name: string; args: Record<string, unknown>}> = [];
  const policy = new ReadPolicy(async (name, args) => {
    calls.push({name, args});
    if (name === 'bc_actions_search') return search(['List_Items_PAG30008']);
    if (name === 'bc_actions_describe') return described(String(args.ActionName));
    return {content:[{type:'text',text:'fixture read'}]};
  });
  await assert.rejects(policy.call('bc_actions_invoke', {ActionName:'List_Items_PAG30008',RequestParameters:'{"top":1,"select":"id"}'}), /discover/i);
  assert.equal(calls.length, 0);
  await policy.call('bc_actions_search',{SearchText:'Items',SearchMode:'keyword',ActionType:['List'],Top:5});
  await assert.rejects(policy.call('bc_actions_invoke',{ActionName:'List_Items_PAG30008',RequestParameters:'{"top":1,"select":"id"}'}), /describe/i);
  await policy.call('bc_actions_describe',{ActionName:'List_Items_PAG30008'});
  await policy.call('bc_actions_invoke',{ActionName:'List_Items_PAG30008',RequestParameters:'{"top":1,"select":"id"}'});
  assert.deepEqual(calls.map(c => c.name), ['bc_actions_search','bc_actions_describe','bc_actions_invoke']);
  assert.equal(JSON.parse(String(calls[2].args.RequestParameters)).resultFormat, 'text');
});

test('rejects writes, poisoned discovery and unbounded parameters before invocation', async () => {
  let invoked = 0;
  const policy = new ReadPolicy(async (name, args) => {
    if (name === 'bc_actions_search') return search(['List_Items_PAG30008']);
    if (name === 'bc_actions_describe') return described(String(args.ActionName));
    invoked++; return {content:[]};
  });
  await assert.rejects(policy.call('bc_actions_search',{SearchText:'item',SearchMode:'keyword',ActionType:['Create'],Top:5}));
  await assert.rejects(policy.call('bc_actions_search',{SearchText:' ',SearchMode:'keyword',ActionType:['List'],Top:5}));
  await assert.rejects(policy.call('bc_actions_invoke',{ActionName:'Create_Items_PAG30008',RequestParameters:'{}'}));
  const poisoned = new ReadPolicy(async()=>search(['Create_Items_PAG30008']));
  await assert.rejects(poisoned.call('bc_actions_search',{SearchText:'item',SearchMode:'keyword',ActionType:['List']}));
  await policy.call('bc_actions_search',{SearchText:'item',SearchMode:'keyword',ActionType:['List']});
  await policy.call('bc_actions_describe',{ActionName:'List_Items_PAG30008'});
  for (const parameters of [{top:0,select:'id'},{top:101,select:'id'},{top:1},{top:1,select:'*'},{top:1,select:'email'},{top:1,select:'id',url:'https://other.invalid'},{top:1,select:'id',resultFormat:'resource'},{top:1,select:'id',expand:'all'}]) {
    await assert.rejects(policy.call('bc_actions_invoke',{ActionName:'List_Items_PAG30008',RequestParameters:JSON.stringify(parameters)}));
  }
  assert.equal(invoked,0);
});

test('description mismatch does not authorize an action', async () => {
  const policy = new ReadPolicy(async name => name==='bc_actions_search' ? search(['List_Items_PAG30008']) : described('List_Other_PAG1'));
  await policy.call('bc_actions_search',{SearchText:'item',SearchMode:'keyword',ActionType:['List']});
  await assert.rejects(policy.call('bc_actions_describe',{ActionName:'List_Items_PAG30008'}),/match/i);
  await assert.rejects(policy.call('bc_actions_invoke',{ActionName:'List_Items_PAG30008',RequestParameters:'{"select":"id","top":1}'}),/describe/i);
});
