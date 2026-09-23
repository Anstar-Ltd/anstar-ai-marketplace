import { mkdir, mkdtemp, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** Keep ACL fixtures away from Windows AppData packaged-app ancestor ACEs. */
export async function privateTestDirectory(prefix: string): Promise<string> {
  const parent = process.platform === 'win32'
    ? path.join(os.homedir(), '.local', 'state', 'anstar-business-central-tests')
    : await realpath(os.tmpdir());
  await mkdir(parent, { recursive: true });
  return mkdtemp(path.join(await realpath(parent), prefix));
}
