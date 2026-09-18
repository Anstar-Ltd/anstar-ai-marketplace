import { constants, type Stats } from 'node:fs';
import { lstat, mkdir, open, rename, rmdir, unlink, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, parse, resolve, sep, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const WINDOWS = process.platform === 'win32';
const NOFOLLOW = WINDOWS ? 0 : constants.O_NOFOLLOW;
const executeFile = promisify(execFile);

// Windows PowerShell 5.1 / .NET Framework only. All commands are fixed; paths
// travel as environment data, never interpolated into code or shell arguments.
// This helper never receives or reads cache contents. Missing PowerShell, ACL
// support, or a local NTFS volume fails closed (no chmod-style fallback).
const WINDOWS_ACL_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
try {
  $p = $env:ANSTAR_AUTH_ACL_PATH
  $operation = $env:ANSTAR_AUTH_ACL_OPERATION
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  function Attributes-OrMissing([string]$path) {
    try { return [int][System.IO.File]::GetAttributes($path) }
    catch [System.IO.FileNotFoundException] { return -1 }
    catch [System.IO.DirectoryNotFoundException] { return -1 }
  }
  function Private-Security([bool]$directory) {
    if ($directory) {
      $acl = [System.Security.AccessControl.DirectorySecurity]::new()
      $inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    } else {
      $acl = [System.Security.AccessControl.FileSecurity]::new()
      $inherit = [System.Security.AccessControl.InheritanceFlags]::None
    }
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,
      [System.Security.AccessControl.FileSystemRights]::FullControl, $inherit,
      [System.Security.AccessControl.PropagationFlags]::None,
      [System.Security.AccessControl.AccessControlType]::Allow))
    return $acl
  }
  function Assert-Private([string]$path, [bool]$directory) {
    $attributes = Attributes-OrMissing $path
    if ($attributes -eq -1) { throw [System.IO.FileNotFoundException]::new() }
    if (($attributes -band 1024) -ne 0 -or (($attributes -band 16) -ne 0) -ne $directory) { throw 'Unsafe type' }
    if ($directory) { $acl = [System.IO.Directory]::GetAccessControl($path) }
    else { $acl = [System.IO.File]::GetAccessControl($path) }
    if (!$acl.AreAccessRulesProtected -or $acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'Unsafe owner/inheritance' }
    $raw = [System.Security.AccessControl.RawSecurityDescriptor]::new($acl.GetSecurityDescriptorBinaryForm(), 0)
    if ($null -eq $raw.DiscretionaryAcl -or $raw.DiscretionaryAcl.Count -ne 1) { throw 'Unsafe DACL' }
    $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 1) { throw 'Unsafe rules' }
    $rule = $rules[0]
    $inherit = 0
    if ($directory) { $inherit = 3 }
    if ($rule.IdentityReference.Value -ne $sid.Value -or $rule.AccessControlType -ne 'Allow' -or
        $rule.FileSystemRights -ne 'FullControl' -or $rule.IsInherited -or
        [int]$rule.InheritanceFlags -ne $inherit -or $rule.PropagationFlags -ne 'None') { throw 'Unsafe rule' }
  }
  function Assert-Ancestor([string]$current) {
    $attributes = Attributes-OrMissing $current
    if ($attributes -eq -1 -or ($attributes -band 1024) -ne 0 -or ($attributes -band 16) -eq 0) { throw 'Unsafe ancestor' }
    $ancestor = [System.IO.Directory]::GetAccessControl($current)
    $trusted = @($sid.Value, 'S-1-5-18', 'S-1-5-32-544', 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
    if ($trusted -notcontains $ancestor.GetOwner([System.Security.Principal.SecurityIdentifier]).Value) { throw 'Unsafe ancestor owner' }
    foreach ($rule in $ancestor.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier])) {
      # Applied Delete/DeleteChild/ChangePermissions/TakeOwnership rights can replace private descendants.
      if ($rule.AccessControlType -eq 'Allow' -and ([int]$rule.PropagationFlags -band 2) -eq 0 -and $trusted -notcontains $rule.IdentityReference.Value -and ([int]$rule.FileSystemRights -band 852032) -ne 0) { throw 'Unsafe ancestor access' }
    }
  }
  function Guard-Directory([string]$path) {
    $root = [System.IO.Path]::GetPathRoot($path)
    $drive = [System.IO.DriveInfo]::new($root)
    if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'Unsupported volume' }
    $current = $root
    Assert-Ancestor $current
    foreach ($part in $path.Substring($root.Length).Split([char]92)) {
      if ($part -match '^(?:\.git|onedrive.*|dropbox.*|icloud.*|cloudstorage|mobile documents|google drive.*)$') { throw 'Unsafe location' }
      $current = [System.IO.Path]::Combine($current, $part)
      $attributes = Attributes-OrMissing $current
      if ($attributes -eq -1) {
        [void][System.IO.Directory]::CreateDirectory($current, (Private-Security $true))
        $attributes = Attributes-OrMissing $current
      }
      Assert-Ancestor $current
      if ((Attributes-OrMissing ([System.IO.Path]::Combine($current, '.git'))) -ne -1) { throw 'Repository location' }
    }
    Assert-Private $path $true
  }
  function Seal-NewRuntimeTree([string]$path) {
    $attributes = Attributes-OrMissing $path
    if ($attributes -eq -1 -or ($attributes -band 1024) -ne 0) { throw 'Unsafe new runtime entry' }
    if (($attributes -band 16) -ne 0) {
      [System.IO.Directory]::SetAccessControl($path, (Private-Security $true))
      foreach ($child in [System.IO.Directory]::EnumerateFileSystemEntries($path)) { Seal-NewRuntimeTree $child }
    } else { [System.IO.File]::SetAccessControl($path, (Private-Security $false)) }
  }
  function Assert-RuntimeTree([string]$path) {
    $attributes = Attributes-OrMissing $path
    if ($attributes -eq -1 -or ($attributes -band 1024) -ne 0) { throw 'Unsafe runtime entry' }
    $directory = ($attributes -band 16) -ne 0
    if ($directory) { $acl = [System.IO.Directory]::GetAccessControl($path) }
    else { $acl = [System.IO.File]::GetAccessControl($path) }
    if ($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'Foreign runtime owner' }
    $rules = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 1 -or $rules[0].IdentityReference.Value -ne $sid.Value -or $rules[0].AccessControlType -ne 'Allow' -or $rules[0].FileSystemRights -ne 'FullControl') { throw 'Unsafe runtime ACL' }
    if ($directory) { foreach ($child in [System.IO.Directory]::EnumerateFileSystemEntries($path)) { Assert-RuntimeTree $child } }
  }
  switch ($operation) {
    'directory' { Guard-Directory $p }
    'runtime-tree' { Guard-Directory $p; Assert-RuntimeTree $p }
    'seal-new-runtime' { Guard-Directory $p; Seal-NewRuntimeTree $p; Assert-RuntimeTree $p }
    'file' { Assert-Private $p $false }
    'seal-new-file' {
      # Only called for an empty, exclusively created temporary in a private dir.
      $attributes = Attributes-OrMissing $p
      if ($attributes -eq -1 -or ($attributes -band 1040) -ne 0) { throw 'Unsafe temporary' }
      [System.IO.File]::SetAccessControl($p, (Private-Security $false))
      Assert-Private $p $false
    }
    'acquire' {
      Guard-Directory $p
      $lock = [System.IO.Path]::Combine($p, '.auth-lock')
      # Directory.CreateDirectory alone is NOT exclusive. Publish a private
      # candidate using Directory.Move, which fails if the destination exists.
      $candidate = [System.IO.Path]::Combine($p, ('.auth-lock-' + [Guid]::NewGuid().ToString('N')))
      [void][System.IO.Directory]::CreateDirectory($candidate, (Private-Security $true))
      try {
        Assert-Private $candidate $true
        try { [System.IO.Directory]::Move($candidate, $lock) }
        catch [System.IO.IOException] {
          # An owner may have released between Move and inspection. Only a
          # genuine missing path permits another acquisition attempt.
          if ((Attributes-OrMissing $lock) -ne -1) {
            try { Assert-Private $lock $true }
            catch [System.IO.FileNotFoundException] { }
            catch [System.IO.DirectoryNotFoundException] { }
          }
          [Console]::Out.Write('BUSY')
          exit 0
        }
      } finally {
        if ((Attributes-OrMissing $candidate) -ne -1) { [System.IO.Directory]::Delete($candidate) }
      }
    }
    default { throw 'Unknown operation' }
  }
  [Console]::Out.Write('OK')
  exit 0
} catch { [Console]::Error.WriteLine('Authentication cache ACL check failed.'); exit 1 }
`;

async function windowsAcl(path: string, operation: 'directory' | 'file' | 'seal-new-file' | 'acquire' | 'runtime-tree' | 'seal-new-runtime'): Promise<'OK' | 'BUSY'> {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !/^[a-z]:\\/i.test(systemRoot) || systemRoot !== resolve(systemRoot)) throw new AuthStoreError();
  try {
    const { stdout } = await executeFile(join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(WINDOWS_ACL_SCRIPT, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 15_000, maxBuffer: 1024, env: { SystemRoot: systemRoot, windir: systemRoot, ANSTAR_AUTH_ACL_PATH: path, ANSTAR_AUTH_ACL_OPERATION: operation } });
    if (stdout === 'OK' || (operation === 'acquire' && stdout === 'BUSY')) return stdout;
  } catch { /* Never surface subprocess errors, arguments, paths, or stderr. */ }
  throw new AuthStoreError();
}

function validWindowsPath(directory: string): boolean {
  return /^[a-z]:\\/i.test(directory) && directory.length > 3 && directory.slice(3).split('\\').every(part =>
    !!part && !/[<>:"|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part) &&
    !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
}

export interface AuthState { cache: string; selectedHomeAccountId: string | null }
export class AuthStoreError extends Error {
  constructor(message = 'Authentication cache is unavailable or unsafe.') { super(message); this.name = 'AuthStoreError'; }
}
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
function owned(stat: Stats, mode: number): void {
  if (stat.isSymbolicLink() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== mode) throw new AuthStoreError();
}

/** Built-in-only guards imported from the installed plugin, never from the cache. */
export async function guardRuntimeDirectory(directory: string): Promise<void> {
  if (!isAbsolute(directory) || directory !== resolve(directory) || (WINDOWS && !validWindowsPath(directory))) throw new AuthStoreError();
  if (WINDOWS) { await windowsAcl(directory, 'directory'); return; }
  let current = parse(directory).root;
  for (const part of directory.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    try { await mkdir(current, {mode:0o700}); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    const info = await lstat(current);
    const stickyRoot = info.uid === 0 && (info.mode & 0o1000) !== 0;
    if (info.isSymbolicLink() || !info.isDirectory() || (info.uid !== 0 && info.uid !== process.getuid?.()) || ((info.mode & 0o022) !== 0 && !stickyRoot)) throw new AuthStoreError();
  }
  owned(await lstat(directory),0o700);
}

/** Seal only a freshly installed private staging tree; never repair a published cache. */
export async function sealNewRuntime(directory: string): Promise<void> {
  await guardRuntimeDirectory(directory);
  if (WINDOWS) await windowsAcl(directory,'seal-new-runtime');
}

export async function guardRuntimeTree(directory: string): Promise<void> {
  await guardRuntimeDirectory(directory);
  if (WINDOWS) { await windowsAcl(directory,'runtime-tree'); return; }
  async function inspect(entry: string): Promise<void> {
    const info = await lstat(entry);
    if (info.uid !== process.getuid?.()) throw new AuthStoreError();
    if (info.isSymbolicLink()) {
      const resolved = await realpath(entry), within = relative(directory,resolved);
      if (within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) throw new AuthStoreError();
      return; // npm .bin links stay inside this tree; their targets are checked separately.
    }
    if ((info.mode & 0o022) !== 0) throw new AuthStoreError();
    if (info.isDirectory()) for (const name of await readdir(entry)) await inspect(join(entry,name));
    else if (!info.isFile() || info.nlink !== 1) throw new AuthStoreError();
  }
  await inspect(directory);
}

/** Plaintext, same-user trust boundary (root/admin remain trusted). Never reclaim
 * a lock automatically. Windows requires built-in PowerShell and local NTFS. */
export class AuthStore {
  private readonly directory: string;
  constructor(directory: string, private readonly context: string, private readonly lockWaitMs = WINDOWS ? 30_000 : 5_000) {
    if (!isAbsolute(directory) || directory !== resolve(directory) || (WINDOWS && !validWindowsPath(directory))) throw new AuthStoreError();
    this.directory = directory;
  }
  private async guardDirectory(): Promise<void> {
    if (WINDOWS) { await windowsAcl(this.directory, 'directory'); return; }
    let current = parse(this.directory).root;
    for (const part of this.directory.slice(current.length).split(sep).filter(Boolean)) {
      if (/^(?:\.git|onedrive.*|dropbox.*|icloud.*|cloudstorage|mobile documents|google drive.*)$/i.test(part)) throw new AuthStoreError();
      current = join(current, part);
      try { await mkdir(current, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      const info = await lstat(current);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new AuthStoreError();
      try { await lstat(join(current, '.git')); throw new AuthStoreError(); } catch (error) { if (!missing(error)) throw error; }
    }
    owned(await lstat(this.directory), 0o700);
  }
  private async read(): Promise<AuthState> {
    const path = join(this.directory, 'auth-cache.json');
    let handle;
    try {
      if (WINDOWS) {
        const info = await lstat(path);
        if (info.isSymbolicLink() || !info.isFile() || info.nlink !== 1 || info.size > MAX_CACHE_BYTES) throw new AuthStoreError();
        await windowsAcl(path, 'file');
      }
      handle = await open(path, constants.O_RDONLY | NOFOLLOW);
    }
    catch (error) { if (missing(error)) return { cache: '', selectedHomeAccountId: null }; throw error; }
    try {
      const info = await handle.stat();
      if (!WINDOWS) owned(info, 0o600);
      if (!info.isFile() || info.nlink !== 1 || info.size > MAX_CACHE_BYTES) throw new AuthStoreError();
      const value: unknown = JSON.parse(await handle.readFile('utf8'));
      if (!value || typeof value !== 'object') throw new AuthStoreError();
      const v = value as Record<string, unknown>;
      if (v.version !== 1 || v.context !== this.context || typeof v.cache !== 'string' || !(v.selectedHomeAccountId === null || (typeof v.selectedHomeAccountId === 'string' && v.selectedHomeAccountId.length > 0))) throw new AuthStoreError();
      return { cache: v.cache, selectedHomeAccountId: v.selectedHomeAccountId as string | null };
    } finally { await handle.close(); }
  }
  private async save(state: AuthState): Promise<void> {
    await this.guardDirectory();
    // Validate the exact existing target before atomic replacement.
    await this.read();
    if (typeof state.cache !== 'string' || !(state.selectedHomeAccountId === null || (typeof state.selectedHomeAccountId === 'string' && state.selectedHomeAccountId.length > 0))) throw new AuthStoreError();
    const body = JSON.stringify({ version: 1, context: this.context, cache: state.cache, selectedHomeAccountId: state.selectedHomeAccountId });
    if (Buffer.byteLength(body) > MAX_CACHE_BYTES) throw new AuthStoreError();
    const temporary = join(this.directory, `.auth-${randomUUID()}.tmp`);
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW, 0o600);
    try {
      if (WINDOWS) await windowsAcl(temporary, 'seal-new-file');
      else owned(await handle.stat(), 0o600);
      await handle.writeFile(body, 'utf8'); await handle.sync();
      await handle.close();
      await this.guardDirectory();
      await this.read();
      await rename(temporary, join(this.directory, 'auth-cache.json'));
      // Node cannot open/fsync Windows directories. File contents are flushed
      // above and rename is atomic on the same local volume, but directory-entry
      // durability across power loss is only provided on POSIX.
      if (!WINDOWS) {
        const dir = await open(this.directory, constants.O_RDONLY | NOFOLLOW);
        try { await dir.sync(); } finally { await dir.close(); }
      }
    } finally { await handle.close().catch(() => {}); await unlink(temporary).catch(error => { if (!missing(error)) throw error; }); }
  }
  async transaction<T>(work: (state: AuthState) => Promise<T>): Promise<T> {
    let acquired = false;
    const lock = join(this.directory, '.auth-lock');
    try {
      await this.guardDirectory();
      const deadline = Date.now() + this.lockWaitMs;
      for (;;) {
        if (WINDOWS) {
          if (await windowsAcl(this.directory, 'acquire') === 'OK') { acquired = true; break; }
        } else {
          try { await mkdir(lock, { mode: 0o700 }); acquired = true; break; }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            try {
              const info = await lstat(lock); owned(info, 0o700);
              if (!info.isDirectory()) throw new AuthStoreError();
            } catch (inspectionError) {
              // Release between EEXIST and lstat is normal, not stale takeover.
              if (!missing(inspectionError)) throw inspectionError;
            }
          }
        }
        if (Date.now() >= deadline) throw new AuthStoreError('Authentication cache is locked; retry later. A crashed owner requires manual lock recovery.');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      await this.guardDirectory();
      const state = await this.read();
      const before = JSON.stringify(state);
      const result = await work(state);
      if (before !== JSON.stringify(state)) await this.save(state);
      return result;
    } catch (error) { if (error instanceof AuthStoreError) throw error; throw new AuthStoreError(); }
    finally { if (acquired) await rmdir(lock).catch(() => { throw new AuthStoreError('Authentication cache lock cleanup failed.'); }); }
  }
}
