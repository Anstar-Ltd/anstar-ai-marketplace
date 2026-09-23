import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateConnection, encodeHeader, privateBaseDirectory } from '../src/config.ts';

const actual = JSON.parse(await readFile(new URL('../connection.json', import.meta.url), 'utf8'));
test('connection pins approved Production and never accepts arbitrary endpoints', () => {
  assert.equal(validateConnection(actual).environmentType,'Production');
  assert.equal(validateConnection(actual).environment,'Production');
  assert.throws(()=>validateConnection({...actual,environment:'sandbox-uat-2026-march'}));
  assert.throws(()=>validateConnection({...actual,company:'Other Company'}));
  for (const bad of [{endpoint:'https://attacker.invalid'}, {environment:'production'}, {tenantId:'../bad'}, {configuration:'\r\nAuthorization: bad'}, {extra:'value'}, {redirectUri:'http://0.0.0.0:33418/callback'}]) {
    assert.throws(()=>validateConnection({...actual,...bad}));
  }
  assert.equal(encodeHeader('Fixture Ltd'),'Fixture Ltd');
  assert.equal(encodeHeader('Århus'),'=?base64?w4VyaHVz?=');
  assert.equal(privateBaseDirectory(), path.join(os.homedir(), '.local', 'state', 'anstar-business-central'));
  assert.equal(privateBaseDirectory().includes(`${path.sep}AppData${path.sep}`), false);
});
