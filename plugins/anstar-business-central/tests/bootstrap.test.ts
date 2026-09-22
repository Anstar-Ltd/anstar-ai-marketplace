import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, chmod, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { prepareRuntime, removeRuntimeStaging } from '../scripts/bootstrap.ts';

test('runtime staging cleanup retries transient Windows filesystem locks', async()=>{
  let calls=0;
  await removeRuntimeStaging('fixture',async()=>{calls++;if(calls<3)throw Object.assign(new Error('busy'),{code:'EBUSY'});});
  assert.equal(calls,3);
  await assert.rejects(removeRuntimeStaging('fixture',async()=>{throw Object.assign(new Error('denied'),{code:'EACCES'});}),/denied/);
});

test('runtime is content-addressed, installed once and refuses symlinked inputs', async () => {
  const temp=await mkdtemp(path.join(await realpath(os.tmpdir()),'bc-bootstrap-'));
  try {
    const source=path.join(temp,'source'), cache=path.join(temp,'cache');
    await mkdir(path.join(source,'src'),{recursive:true});
    await writeFile(path.join(source,'package.json'),'{"name":"fixture","version":"1.0.0"}');
    await writeFile(path.join(source,'package-lock.json'),'{"lockfileVersion":3,"packages":{}}');
    await writeFile(path.join(source,'connection.json'),'{}');
    await writeFile(path.join(source,'src/server.ts'),'// fixture');
    let installs=0;
    const install=async()=>{installs++;};
    const first=await prepareRuntime(source,cache,install);
    const second=await prepareRuntime(source,cache,install);
    assert.equal(first,second);assert.equal(installs,1);
    assert.equal(await readFile(path.join(first,'src/server.ts'),'utf8'),'// fixture');
    await writeFile(path.join(source,'src/server.ts'),'// changed');
    assert.notEqual(await prepareRuntime(source,cache,install),first);
    assert.equal(installs,2);
    if(process.platform!=='win32') {
      await chmod(path.join(first,'src/server.ts'),0o666);
      await writeFile(path.join(source,'src/server.ts'),'// fixture');
      await assert.rejects(prepareRuntime(source,cache,install),/unsafe/i);
      await chmod(path.join(first,'src/server.ts'),0o600);
      await chmod(cache,0o755);
      await assert.rejects(prepareRuntime(source,cache,install),/unsafe/i);
      await chmod(cache,0o700);
      await chmod(first,0o777);
      await writeFile(path.join(source,'src/server.ts'),'// fixture');
      await assert.rejects(prepareRuntime(source,cache,install),/unsafe/i);
      await chmod(first,0o700);
      await symlink(path.join(source,'package.json'),path.join(source,'src/escape.ts'));
      await assert.rejects(prepareRuntime(source,cache,install),/symlink/i);
    }
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('Windows runtime rejects another-user write ACL before executing cached code', {skip:process.platform!=='win32'}, async()=>{
  const temp=await mkdtemp(path.join(await realpath(os.tmpdir()),'bc-runtime-acl-'));
  try {
    const source=path.join(temp,'source'),cache=path.join(temp,'cache');
    await mkdir(path.join(source,'src'),{recursive:true});
    for(const name of ['package.json','package-lock.json','connection.json']) await writeFile(path.join(source,name),'{}');
    await writeFile(path.join(source,'src/server.ts'),'// fixture');
    const runtime=await prepareRuntime(source,cache,async()=>{});
    const script="$ErrorActionPreference='Stop'; $p=$env:BC_TEST_PATH; $a=[IO.File]::GetAccessControl($p); $a.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'Write','Allow')); [IO.File]::SetAccessControl($p,$a)";
    await promisify(execFile)(path.join(process.env.SystemRoot!,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...process.env,BC_TEST_PATH:path.join(runtime,'src/server.ts')}});
    await assert.rejects(prepareRuntime(source,cache,async()=>{}),/unsafe/i);
  } finally {await rm(temp,{recursive:true,force:true});}
});
