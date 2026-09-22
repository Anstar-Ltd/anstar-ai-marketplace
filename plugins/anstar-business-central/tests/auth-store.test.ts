import test from 'node:test';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm, stat, mkdir, symlink, chmod, utimes, link, readdir, readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthStore, AuthStoreError } from '../src/auth-store.ts';

const windows = process.platform === 'win32';
const lockWaitMs = windows ? 60_000 : 5_000;

test('Windows guard includes volume-root ACL before descending (source contract)', async()=>{
  // Never mutate a real machine's volume-root ACL to test this invariant.
  const source=await readFile(new URL('../src/auth-store.ts',import.meta.url),'utf8');
  assert.match(source,/\$current = \$root\s+Assert-Ancestor \$current\s+foreach/);
});

async function fixture() {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'bc-auth-test-'));
  return { root, directory: join(root, 'cache'), cleanup: () => rm(root, { recursive: true, force: true }) };
}

async function rejectsBeforeWork(store: AuthStore): Promise<void> {
  let entered = false;
  await assert.rejects(store.transaction(async () => { entered = true; }), AuthStoreError);
  assert.equal(entered, false, 'unsafe cache must not invoke the operation');
}

test('cross-process transactions serialize full fresh read/operation/save generations', { timeout: 240_000 }, async () => {
  const f = await fixture();
  try {
    const source = `import { AuthStore } from ${JSON.stringify(new URL('../src/auth-store.ts', import.meta.url).href)}; const store = new AuthStore(${JSON.stringify(f.directory)}, 'fixture-context', ${lockWaitMs}); await store.transaction(async state => { const n = Number(state.cache || 0); await new Promise(r => setTimeout(r, 60)); state.cache = String(n + 1); });`;
    await Promise.all(Array.from({ length: 4 }, () => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
      let error = ''; child.stderr.on('data', chunk => { error += chunk; });
      child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(new Error(error)));
    })));
    await new AuthStore(f.directory, 'fixture-context').transaction(async state => { assert.equal(state.cache, '4'); });
  } finally { await f.cleanup(); }
});

test('POSIX symlinks and permissive modes fail closed', { skip: windows }, async () => {
  const f = await fixture();
  try {
    await mkdir(f.directory, { mode: 0o700 });
    const store = new AuthStore(f.directory, 'fixture-context');
    await symlink(join(f.root, 'missing'), join(f.directory, 'auth-cache.json'));
    await assert.rejects(store.transaction(async () => {}), /unsafe/);
    await rm(join(f.directory, 'auth-cache.json'));
    await chmod(f.directory, 0o755); await assert.rejects(store.transaction(async () => {}), /unsafe/);
    await chmod(f.directory, 0o700);
    await mkdir(join(f.root, '.git')); await assert.rejects(store.transaction(async () => {}), /unsafe/);
    await rm(join(f.root, '.git'), { recursive: true });
    await assert.rejects(new AuthStore(join(f.root, 'OneDrive-Work', 'cache'), 'fixture-context').transaction(async () => {}), /unsafe/);
    await store.transaction(async state => { state.cache = '{}'; });
    await chmod(join(f.directory, 'auth-cache.json'), 0o644); await assert.rejects(store.transaction(async () => {}), /unsafe/);
  } finally { await f.cleanup(); }
});

test('old lock is never stolen and failed operation never overwrites state', async () => {
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context', 30);
    await store.transaction(async state => { state.cache = 'generation-1'; });
    await assert.rejects(store.transaction(async state => { state.cache = 'generation-2'; throw new Error('fixture-secret'); }), /unsafe/);
    await store.transaction(async state => { assert.equal(state.cache, 'generation-1'); });
    await mkdir(join(f.directory, '.auth-lock'), { mode: 0o700 });
    if (windows) await windowsAcl(join(f.directory, '.auth-lock'), 'protect-inherited');
    await utimes(join(f.directory, '.auth-lock'), new Date(0), new Date(0));
    await assert.rejects(store.transaction(async () => { assert.fail('must not enter'); }), /manual lock recovery/);
    assert.equal((await stat(join(f.directory, '.auth-lock'))).isDirectory(), true);
  } finally { await f.cleanup(); }
});

test('transaction persists one atomic cache and selected-account generation privately', async () => {
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context');
    await store.transaction(async state => {
      assert.equal(state.selectedHomeAccountId, null);
      state.cache = '{"fixtureGeneration":1}';
      state.selectedHomeAccountId = 'fixture-home';
    });
    const reread = new AuthStore(f.directory, 'fixture-context');
    await reread.transaction(async state => {
      assert.equal(state.cache, '{"fixtureGeneration":1}');
      assert.equal(state.selectedHomeAccountId, 'fixture-home');
    });
    if (windows) {
      await windowsAcl(f.directory, 'check-directory');
      await windowsAcl(join(f.directory, 'auth-cache.json'), 'check-file');
    } else {
      assert.equal((await stat(f.directory)).mode & 0o777, 0o700);
      assert.equal((await stat(join(f.directory, 'auth-cache.json'))).mode & 0o777, 0o600);
    }
  } finally { await f.cleanup(); }
});

test('invalid callback state is rejected before replacing the valid generation', async () => {
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context');
    await store.transaction(async state => { state.cache = 'generation-1'; });
    await assert.rejects(store.transaction(async state => { state.selectedHomeAccountId = ''; }), AuthStoreError);
    await store.transaction(async state => { assert.equal(state.cache, 'generation-1'); assert.equal(state.selectedHomeAccountId, null); });
    assert.deepEqual(await readdir(f.directory), ['auth-cache.json']);
  } finally { await f.cleanup(); }
});

test('POSIX retries acquisition if the previous owner releases before lock inspection', { skip: windows }, async t => {
  const f = await fixture();
  try {
    await mkdir(f.directory, { mode: 0o700 });
    const lock = join(f.directory, '.auth-lock');
    await mkdir(lock, { mode: 0o700 });
    const original = fsPromises.lstat;
    let raced = false;
    t.mock.method(fsPromises, 'lstat', async (...args: Parameters<typeof original>) => {
      if (args[0] === lock && !raced) { raced = true; await rm(lock, { recursive: true }); }
      return original(...args);
    });
    syncBuiltinESMExports();
    let entered = false;
    await new AuthStore(f.directory, 'fixture-context').transaction(async () => { entered = true; });
    assert.equal(raced, true);
    assert.equal(entered, true);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); await f.cleanup(); }
});

// Only fixture paths enter the subprocess environment. The script/argv are fixed,
// and all ACL assertions are independent of the production implementation.
const ACL_TEST_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $p = $env:BC_AUTH_TEST_PATH
  $op = $env:BC_AUTH_TEST_OP
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $isDir = [System.IO.Directory]::Exists($p)
  if ($isDir) { $acl = [System.IO.Directory]::GetAccessControl($p) }
  else { $acl = [System.IO.File]::GetAccessControl($p) }
  if ($op -eq 'grant-reader') {
    $other = [System.Security.Principal.SecurityIdentifier]::new('S-1-1-0')
    $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($other, 'ReadAndExecute', 'Allow'))
  } elseif ($op -eq 'enable-inheritance') {
    $acl.SetAccessRuleProtection($false, $true)
  } elseif ($op -eq 'wrong-owner') {
    $acl.SetOwner([System.Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
  } elseif ($op -eq 'protect-inherited') {
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $true)
  } elseif ($op -like 'check-*') {
    if (($op -eq 'check-directory') -ne $isDir) { throw 'Wrong kind' }
    if (!$acl.AreAccessRulesProtected -or $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'Unsafe owner/inheritance' }
    $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 1) { throw 'Extra ACL rule' }
    $rule = $rules[0]
    if ($rule.IdentityReference.Value -ne $sid.Value -or $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl' -or $rule.IsInherited -or $rule.PropagationFlags -ne 'None') { throw 'Unsafe ACL rule' }
    if ($isDir -and [int]$rule.InheritanceFlags -ne 3) { throw 'Children not private' }
    if (!$isDir -and $rule.InheritanceFlags -ne 'None') { throw 'Unexpected inheritance flags' }
    exit 0
  } else { throw 'Unknown operation' }
  if ($isDir) { [System.IO.Directory]::SetAccessControl($p, $acl) }
  else { [System.IO.File]::SetAccessControl($p, $acl) }
  exit 0
} catch { [Console]::Error.WriteLine('Fixture ACL operation failed.'); exit 1 }
`;
async function windowsAcl(path: string, operation: string): Promise<void> {
  await promisify(execFile)(join(process.env.SystemRoot!, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ACL_TEST_SCRIPT, 'utf16le').toString('base64')],
    { windowsHide: true, timeout: 30_000, env: { ...process.env, BC_AUTH_TEST_PATH: path, BC_AUTH_TEST_OP: operation } });
}

test('Windows creates owner-only protected cache using literal paths', { skip: !windows }, async () => {
  const f = await fixture();
  try {
    const directory = join(f.root, "cache ' ; $name [literal]");
    const store = new AuthStore(directory, 'fixture-context');
    await store.transaction(async state => { state.cache = 'generation-1'; });
    await windowsAcl(directory, 'check-directory');
    await windowsAcl(join(directory, 'auth-cache.json'), 'check-file');
    await store.transaction(async state => { assert.equal(state.cache, 'generation-1'); state.cache = 'generation-2'; });
    await store.transaction(async state => { assert.equal(state.cache, 'generation-2'); });
    await windowsAcl(join(directory, 'auth-cache.json'), 'check-file');
  } finally { await f.cleanup(); }
});

for (const target of ['directory', 'file', 'lock'] as const) {
  for (const operation of ['grant-reader', 'enable-inheritance']) {
    test(`Windows rejects ${operation} on existing ${target} without repairing it`, { skip: !windows }, async () => {
      const f = await fixture();
      try {
        const store = new AuthStore(f.directory, 'fixture-context', 1);
        await store.transaction(async state => { state.cache = 'generation-1'; });
        const path = target === 'directory' ? f.directory : join(f.directory, target === 'file' ? 'auth-cache.json' : '.auth-lock');
        if (target === 'lock') { await mkdir(path); await windowsAcl(path, 'protect-inherited'); }
        await windowsAcl(path, operation);
        await rejectsBeforeWork(store);
        await assert.rejects(windowsAcl(path, target === 'file' ? 'check-file' : 'check-directory'));
      } finally { await f.cleanup(); }
    });
  }
}

test('Windows rejects junctions and aliased/nonlocal paths', { skip: !windows }, async () => {
  const f = await fixture();
  try {
    const destination = join(f.root, 'destination');
    await mkdir(destination);
    await symlink(destination, f.directory, 'junction');
    await assert.rejects(new AuthStore(f.directory, 'fixture-context').transaction(async () => {}), /unsafe/);
    await assert.rejects(new AuthStore(join(f.directory, 'nested'), 'fixture-context').transaction(async () => {}), /unsafe/);
    for (const path of ['\\\\server\\share\\cache', '\\\\?\\C:\\cache', 'C:\\cache:stream', 'C:\\cache.', 'C:\\cache ', 'C:\\NUL', 'C:\\']) {
      assert.throws(() => new AuthStore(path, 'fixture-context'), AuthStoreError);
    }
  } finally { await f.cleanup(); }
});

test('Windows rejects a foreign owner instead of silently resetting it', { skip: !windows }, async () => {
  // windows-latest runs with the rights needed to assign the Administrators SID.
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context');
    await store.transaction(async state => { state.cache = 'generation-1'; });
    await windowsAcl(join(f.directory, 'auth-cache.json'), 'wrong-owner');
    await rejectsBeforeWork(store);
  } finally { await f.cleanup(); }
});

test('Windows fails closed when its ACL helper cannot be started', { skip: !windows }, async () => {
  const f = await fixture();
  const systemRoot = process.env.SystemRoot;
  try {
    process.env.SystemRoot = join(f.root, 'missing-windows-installation');
    await rejectsBeforeWork(new AuthStore(f.directory, 'fixture-context'));
  } finally {
    if (systemRoot === undefined) delete process.env.SystemRoot;
    else process.env.SystemRoot = systemRoot;
    await f.cleanup();
  }
});

test('repository, sync paths, hardlinks and cache context mismatches fail closed', async () => {
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context');
    await store.transaction(async state => { state.cache = 'generation-1'; });
    await assert.rejects(new AuthStore(f.directory, 'other-context').transaction(async () => {}), AuthStoreError);
    await mkdir(join(f.root, '.git'));
    await assert.rejects(store.transaction(async () => {}), AuthStoreError);
    await rm(join(f.root, '.git'), { recursive: true });
    await assert.rejects(new AuthStore(join(f.root, 'OneDrive-Work', 'cache'), 'fixture-context').transaction(async () => {}), AuthStoreError);
    await link(join(f.directory, 'auth-cache.json'), join(f.directory, 'alias'));
    await assert.rejects(store.transaction(async () => {}), AuthStoreError);
  } finally { await f.cleanup(); }
});

test('safe store errors survive and arbitrary callback errors are redacted', async () => {
  const f = await fixture();
  try {
    const store = new AuthStore(f.directory, 'fixture-context');
    const safe = new AuthStoreError('Authentication cache is locked; retry later.');
    await assert.rejects(store.transaction(async () => { throw safe; }), error => error === safe);
    await assert.rejects(store.transaction(async () => { throw new Error('fixture-secret-not-for-output'); }), error => {
      assert.ok(error instanceof AuthStoreError);
      assert.equal(error.message, 'Authentication cache is unavailable or unsafe.');
      assert.equal(error.cause, undefined);
      return true;
    });
  } finally { await f.cleanup(); }
});
