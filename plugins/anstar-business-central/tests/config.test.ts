import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateConnection, encodeHeader, privateBaseDirectory } from '../src/config.ts';

const actual = JSON.parse(await readFile(new URL('../connection.json', import.meta.url), 'utf8'));
test('connection pins the approved sandbox and never accepts arbitrary endpoints', () => {
  assert.equal(validateConnection(actual).environmentType,'Sandbox');
  assert.throws(()=>validateConnection({...actual,company:'Other Company'}));
  for (const bad of [{endpoint:'https://attacker.invalid'}, {environment:'Production'}, {tenantId:'../bad'}, {configuration:'\r\nAuthorization: bad'}, {extra:'value'}, {redirectUri:'http://0.0.0.0:33418/callback'}]) {
    assert.throws(()=>validateConnection({...actual,...bad}));
  }
  assert.equal(encodeHeader('Fixture Ltd'),'Fixture Ltd');
  assert.equal(encodeHeader('Århus'),'=?base64?w4VyaHVz?=');
  assert.ok(privateBaseDirectory().includes('anstar-business-central'));
});
