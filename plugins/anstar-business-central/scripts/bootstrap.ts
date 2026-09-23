// This entrypoint uses only Node built-ins: npx supplies the pinned tsx runner.
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardRuntimeDirectory, guardRuntimeTree, sealNewRuntime } from '../src/auth-store.ts';

async function privateDirectory(directory: string): Promise<void> {
  await guardRuntimeDirectory(directory);
}
async function payload(source: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  async function add(relative: string): Promise<void> {
    const stat = await lstat(path.join(source, relative));
    if (stat.isSymbolicLink()) throw new Error('Symlinked plugin input refused.');
    if (stat.isDirectory()) {
      for (const name of (await readdir(path.join(source, relative))).sort()) await add(path.join(relative, name));
    } else if (stat.isFile()) files.set(relative, await readFile(path.join(source, relative)));
    else throw new Error('Unsupported plugin input.');
  }
  for (const relative of ['package.json', 'package-lock.json', 'connection.json', 'src']) await add(relative);
  return files;
}

export async function removeRuntimeStaging(
  directory: string,
  remove: (path: string, options: { recursive: true; force: true }) => Promise<void> = rm,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try { await remove(directory, { recursive: true, force: true }); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(code ?? '') || attempt >= 5) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
}

export async function prepareRuntime(source: string, cache: string, install: (directory: string) => Promise<void>): Promise<string> {
  const files = await payload(source);
  const hash = createHash('sha256');
  for (const [name, bytes] of files) hash.update(name).update('\0').update(bytes).update('\0');
  const digest = hash.digest('hex');
  await privateDirectory(cache);
  const target = path.join(cache, digest);
  try {
    const stat = await lstat(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Unsafe existing runtime.');
    await privateDirectory(target);
    const marker = await lstat(path.join(target, '.ready'));
    if (!marker.isFile() || marker.isSymbolicLink() || (process.platform !== 'win32' && (marker.uid !== process.getuid?.() || (marker.mode & 0o022) !== 0))) throw new Error('Unsafe runtime marker.');
    if (await readFile(path.join(target, '.ready'), 'utf8') === digest) { await guardRuntimeTree(target); return target; }
    throw new Error('Incomplete runtime cache; remove this exact cache entry before retrying.');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const staging = path.join(cache, `.install-${randomUUID()}`);
  await privateDirectory(staging);
  try {
    for (const [name, bytes] of files) {
      await mkdir(path.dirname(path.join(staging, name)), { recursive: true, mode: 0o700 });
      await writeFile(path.join(staging, name), bytes, { mode: 0o600, flag: 'wx' });
    }
    await install(staging);
    await writeFile(path.join(staging, '.ready'), digest, { mode: 0o600, flag: 'wx' });
    await sealNewRuntime(staging);
    await guardRuntimeTree(staging);
    try { await rename(staging, target); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      const stat = await lstat(target);
      if (!stat.isDirectory() || stat.isSymbolicLink() || await readFile(path.join(target, '.ready'), 'utf8') !== digest) throw error;
      await guardRuntimeTree(target);
    }
    return target;
  } finally { await removeRuntimeStaging(staging); }
}

async function main(): Promise<void> {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required.');
  process.umask(0o077);
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  // Use the same private profile-level state root on every platform. In
  // particular, avoid Windows AppData ancestors carrying applied packaged-app
  // capability ACEs, which the fail-closed ancestor guard must reject.
  const root = path.join(os.homedir(), '.local', 'state', 'anstar-business-central');
  const runtime = await prepareRuntime(source, path.join(root, 'runtime'), async directory => {
    const execPath = process.env.npm_execpath;
    if (!execPath || !path.isAbsolute(execPath) || !['npm-cli.js', 'npx-cli.js'].includes(path.basename(execPath))) throw new Error('Launch through npx tsx so the trusted npm CLI can be located.');
    const npm = path.join(path.dirname(execPath), 'npm-cli.js');
    process.stderr.write('Preparing pinned Business Central dependencies (first run only).\n');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'], { cwd: directory, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
      const timer = setTimeout(() => { child.kill(); reject(new Error('Dependency installation timed out.')); }, 180000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('Could not run npm dependency installation.')); });
      child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('Pinned dependency installation failed; check Node/npm and network access.')); });
    });
  });
  const child = spawn(process.execPath, ['--import', 'tsx', './src/server.ts'], { cwd: runtime, stdio: 'inherit', windowsHide: true });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal));
  child.once('error', () => { process.stderr.write('Business Central runtime could not start.\n'); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code ?? 1; });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : 'Bootstrap failed.'}\n`); process.exitCode = 1; });
}
