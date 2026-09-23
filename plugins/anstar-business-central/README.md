# Anstar Business Central

**Available for installation.** Version `0.3.0-preview.2` starts personal Microsoft sign-in on first Business Central use and targets **Production / Anstar Ltd / Anstar AI Read Only**. Production sign-in, process-restart reuse, and one-row reads of Items, Item Ledger Entries and Sales Orders passed; no writes were attempted. Clean install/reuse passes on macOS, Windows and Linux. See [verification.md](verification.md).

## What it provides

- Microsoft-hosted API access at `https://mcp.businesscentral.dynamics.com`, through a local stdio MCP adapter—no Anstar-hosted service.
- Personal Microsoft sign-in using Microsoft's MSAL library, PKCE S256, the existing tenant-owned public client and a fixed loopback callback. **No global Codex callback settings or client secrets.**
- Three business dispatchers: `bc_actions_search`, `bc_actions_describe`, `bc_actions_invoke`; plus two small connection tools, `bc_connect` and `bc_status`. Search/describe loads only relevant API schemas, not every BC tool. This is dynamic discovery, not a client `defer` flag.
- Generic **List** reads from API pages/queries exposed by BC, including supported custom APIs. This is not arbitrary table access or a promise of all OData/AL objects. Nested operations requiring additional route arguments are not yet supported by the local parameter allowlist.
- A local fail-closed guard: discover → describe → invoke; selected fields required, at most 100 rows per call, text results, bounded response bytes, no create/modify/delete/bound actions, arbitrary URLs, expansion or resource downloads.

Target: **Production / Anstar Ltd / Anstar AI Read Only**, pinned in `connection.json` and validated in code. No environment fallback. The user explicitly approved this target and bounded Production verification; no Production business writes are authorized. The sandbox configuration remains separate and unchanged.

## Employee prerequisites and installation

Required: **Node.js 22+ with npm/npx on PATH**, a compatible local Codex/desktop MCP runtime, internet access, and an entitled normal Microsoft work account. Having npx alone does not prove the installed Node version is compatible. On Windows the protected cache also requires built-in Windows PowerShell 5.1/.NET ACL support and a local NTFS volume; clean installation and cache reuse are verified in Windows CI.

No Azure/PnP/BC CLI, Python, Git, Docker, global tsx installation or manual `npm install` is required for employees. On first launch the plugin automatically downloads pinned `tsx@4.23.13` and installs its locked production dependencies into a private, content-addressed local runtime cache with npm lifecycle scripts disabled. Further launches reuse it. Registry access is required for first use and changed releases. First setup can take several minutes on Windows because the dependency tree is protected before execution; startup is bounded to seven minutes. Dependencies are code running as the employee; Anstar owns review and updates.

Employee flow:

1. Refresh/upgrade **Anstar AI**, then install **Anstar Business Central**.
2. Send your first Business Central message. The bundled skill checks `bc_status` and starts `bc_connect` automatically if needed—no separate “connect” request. A direct unauthenticated business-tool call also returns `authenticationRequired` with the sign-in link without reading BC data. Open it on **the same computer** and authenticate as yourself.
3. The callback page confirms completion; the agent checks `bc_status`, then performs search → describe → a bounded read.
4. Subsequent sessions use the stored account and MSAL's silent renewal. A new interactive login may be required by Microsoft policy.

Technical installation equivalent:

```sh
codex plugin marketplace upgrade anstar-ai
codex plugin add anstar-business-central@anstar-ai
```

Do **not** run `codex mcp login` for this stdio adapter. The first relevant message is handled by the plugin skill; MCP cannot observe arbitrary chat messages before the host invokes it. Startup/listing tools stays passive, unrelated chats do not initiate login, and no browser is opened automatically. Pending sign-in calls reuse the same in-memory link until it expires. The returned URL is ephemeral authorization material—do not copy it into tickets or logs.

The user reported the local ChatGPT connection works; Production was independently verified through the same adapter. Windows clean installation is CI-verified; live Windows sign-in is not. Hosted ChatGPT/web cannot execute a local npx process; no hosted `.app.json` connector is supplied or claimed.

## Read-only boundary

Microsoft requires delegated **Financials.ReadWrite.All**, which is **not a read-only token**. The Production configuration `Anstar AI Read Only` was created by the user and its bounded List reads passed. It must keep **Unblock Edit Tools OFF** and all Create/Modify/Delete/Bound Action permissions OFF. The adapter additionally validates each List action and request, but this local guard is not a server-side authorization boundary: another process with the same token may use the user's broader BC permissions.

BC role assignments are additive. Adding a read-only role does not revoke existing write rights. Restrict identities through a separate administrator-approved policy where required; do not change employee roles or test denied writes during installation. [ADMIN-SETUP.md](ADMIN-SETUP.md) records the existing app, callback and configuration.

## Data flow and credentials

Codex/desktop → local Anstar adapter → Microsoft Entra / Microsoft BC MCP. BC results enter the agent/model provider context. npm receives package-download requests, not BC tokens or query data. No telemetry is added by the adapter. Microsoft operates the remote service; Anstar maintains the adapter, pins and tests its dependencies. See [third-party notices](../../THIRD_PARTY_NOTICES.md).

MSAL cache data, including refresh tokens, is stored **unencrypted at rest** in a permission-restricted, nonsynced per-user directory outside the plugin/repository:

- All platforms: `~/.local/state/anstar-business-central/auth/<connection-hash>/` (on Windows, `~` is the local user profile)

Require disk encryption, protected backups and trusted same-user software. This is not an OS keychain or a boundary against same-user processes. Cache identity includes the client, tenant, target and scope. Full read/refresh/save transactions are locked across processes; crashed-owner locks are never stolen automatically. Login PKCE/state remain in memory and expire after ten minutes. Logs omit tokens, business rows and raw OAuth errors; do not enable SDK debug logging.

## Verification

From repository root:

```sh
python3 scripts/validate_plugins.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/smoke_business_central.py
```

From this plugin directory:

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm audit --omit=dev
npx --no-install tsx scripts/check-install.ts
```

The Python smoke uses real Codex 0.146.0 and macOS `sandbox-exec` to verify the release hold and disposable local installation/readback with all network denied. The install probe uses a fresh home, empty npm cache and plugin copy without node_modules; it starts the exact npx command twice and checks MCP discovery/status, without starting OAuth or making BC calls. Synthetic auth tests exercise the real MSAL library; they are not live Microsoft evidence.

## Troubleshooting

- **Not available/disabled:** upgrade the Anstar AI marketplace and reinstall/enable this plugin; do not copy an old staged test package.
- **npx not found / unsupported Node:** install the organization's supported Node 22+ distribution, then restart the host so PATH is refreshed.
- **First start fails:** check npm-registry access, disk permissions and startup timeout; no fallback to an unpinned package.
- **Sign-in required:** call `bc_connect`, complete the link on this machine, then `bc_status`. Do not share passwords, codes or tokens in chat.
- **Callback unavailable / AADSTS50011:** port 33418 must be free; retain the exact registered callback in ADMIN-SETUP. Do not change another plugin's settings.
- **Cache locked after a crash:** stop the adapter processes; IT may recover only the exact stale `.auth-lock` directory after confirming there is no owner. Never delete a possibly live lock or print the cache.
- **No actions / unsupported discovery format:** verify Dynamic Tool Mode and exact Production configuration; report schema changes rather than weakening the guard.
- **Unexpected writes advertised:** stop and have IT audit the BC configuration. Never invoke one to test rejection.
