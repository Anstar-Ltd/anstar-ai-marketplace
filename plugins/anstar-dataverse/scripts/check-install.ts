// Explicit registry-enabled installation probe. Never calls dv_connect, dv_tools or dv_call.
import assert from 'node:assert/strict';
import { cp, mkdtemp, realpath, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Keep the isolated Windows home directly below the real profile: PowerShell
// 5.1 ACL APIs still hit legacy path limits on a deep node_modules tree.
const base = process.platform === 'win32'
  ? await mkdtemp(path.join(os.homedir(), '.dvi-'))
  : await mkdtemp(path.join(await realpath(os.tmpdir()), 'dataverse-install-'));
try {
  const source = fileURLToPath(new URL('..', import.meta.url));
  const clean = path.join(base, 'marketplace with spaces', 'plugin');
  await cp(source, clean, { recursive: true, filter: input => !path.relative(source, input).split(path.sep).includes('node_modules') });
  await assert.rejects(stat(path.join(clean, 'node_modules')));
  const home = path.join(base, 'home');
  const environment: Record<string, string> = { PATH: process.env.PATH ?? '', HOME: home, USERPROFILE: home, SystemRoot: process.env.SystemRoot ?? '', npm_config_cache: path.join(base, 'npm-cache'), npm_config_registry: 'https://registry.npmjs.org' };
  const outputs = [];
  for (let run = 0; run < 2; run++) {
    const client = new Client({ name: 'dataverse-clean-install-probe', version: '1' });
    const transport = new StdioClientTransport({ command: 'npx', args: ['-y', 'tsx@4.23.13', './scripts/bootstrap.ts'], cwd: clean, env: environment, stderr: 'pipe' });
    let stderr = '';
    transport.stderr?.on('data', chunk => { stderr += String(chunk); });
    try {
      await client.connect(transport, { timeout: 420000 });
      const tools = await client.listTools();
      assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ['dv_call', 'dv_connect', 'dv_status', 'dv_tools']);
      const status = await client.callTool({ name: 'dv_status', arguments: {} });
      assert.equal(status.isError, undefined, JSON.stringify(status));
      assert.deepEqual(JSON.parse((status.content as Array<{ text: string }>)[0].text), { authenticated: false, loginPending: false });
      assert.equal(stderr.includes('Preparing pinned Dataverse dependencies'), run === 0);
      outputs.push({ run: run + 1, tools: tools.tools.length, authenticated: false, dependencyInstall: run === 0 });
    } catch (error) {
      // This probe never authenticates: stderr can only contain dependency/startup errors.
      process.stderr.write(stderr);
      throw error;
    } finally { await client.close(); }
  }
  console.log(JSON.stringify({ result: 'PASS', platform: process.platform, network: 'npm registry only; no OAuth or Dataverse calls', isolatedHome: true, globalCodexConfiguration: false, runs: outputs }));
} finally { await rm(base, { recursive: true, force: true }); }
