# Anstar Business Central — staged preview

**Not ready for employee installation.** The marketplace entry is `NOT_AVAILABLE` and the MCP server is `enabled: false`. The dedicated client ID completed interactive Microsoft sign-in in an isolated Codex pilot. Live MCP reads have **not** been verified: the authenticated endpoint reports that `Anstar AI Read Only` was not found or is not active. This is an administrator/reviewer preview, not a completed rollout.

## What it packages

- Microsoft's official hosted MCP: `https://mcp.businesscentral.dynamics.com`.
- Native Streamable HTTP transport and per-user Microsoft OAuth through a dedicated Anstar-owned public-client app.
- Raw discovery-first reads across API pages exposed by BC, including supported custom API pages. Not arbitrary tables, all OData services, or every AL object; Microsoft currently excludes API pages of subtype ListPart/CardPart.
- Three model-visible dispatchers: `bc_actions_search`, `bc_actions_describe`, `bc_actions_invoke`. Search and describe only relevant operations instead of loading every API schema. This is **server-side dynamic discovery**, not a special client `defer` flag and not OAuth dynamic client registration. No numerical token savings are claimed.
- One small source/safety skill; no task-specific business workflows yet.

The configured pilot is sandbox-only. The exact target is visible in `.mcp.json`. Production is not a fallback. Changing environment/company is a separately reviewed configuration release.

## Runtime dependencies

**No additional CLI, Node.js, npm/npx, Azure CLI, PnP CLI, BC developer tooling, local proxy, container, or hosted Anstar gateway is required by this native-HTTP package.** The employee needs a compatible Codex/ChatGPT desktop runtime, a BC-entitled normal Microsoft work account, internet access, and the completed IT prerequisites below. Development-machine authentication is neither shipped nor relied on.

Python 3 and Codex CLI are used for repository validation only. The compatibility baseline tested is **Codex CLI 0.146.0**. ChatGPT desktop Work and Windows have separate pilot gates; a passing CLI install is not proof of either.

## One-time administrator prerequisites

See [ADMIN-SETUP.md](ADMIN-SETUP.md) for the exact handoff and release checklist:

1. Dedicated Entra public-client registration and tenant-admin consent.
2. Explicit read-only BC MCP configuration in the authorized sandbox.
3. IT-managed callback configuration for Codex 0.146.0. This version ignores plugin-specific callback settings. **Approval to deploy these settings is still pending.** Do not silently modify an employee's global Codex configuration.
4. The administrator-supplied public client ID is now packaged. Verify login/discovery/read, then separately enable and release it. Client/tenant IDs are public identifiers, not credentials; tokens and secrets never belong in Git.

## Intended employee flow after release

These steps are **not available yet**:

1. Upgrade/refresh **Anstar AI** in Plugins Directory.
2. Install **Anstar Business Central** in desktop Work or Codex.
3. Sign in with the employee's normal Microsoft account, not an administrator account.
4. Start a new chat and ask for a bounded read. The agent should use search → describe → invoke.

Technical equivalent **after the release gates pass**:

```sh
codex plugin marketplace upgrade anstar-ai
codex plugin add anstar-business-central@anstar-ai
codex mcp login anstar-business-central
```

The native CLI `plugin add` does not itself initiate OAuth; desktop/app-server installation may. A marketplace authentication policy is not proof that sign-in succeeded. IT should provision callback settings centrally so employees do not need these commands or manual configuration.

## Read-only means a server-side configuration

Microsoft documents delegated **Financials.ReadWrite.All** for this MCP. It is **not a read-only OAuth permission**. There is no claim that hiding tools, requesting approval, or the skill makes this token intrinsically read-only.

The dedicated BC configuration must have **Unblock Edit Tools OFF**, no create/modify/delete/bound-action permissions, and the user's BC permission sets must remain least-privileged. The three dispatcher names do not prevent `invoke` from running writes if an administrator later enables them. Do not activate this connection until that boundary is verified. Do not test denial by attempting a write.

For genuine identity-level read-only restriction, use an appropriately restricted BC identity/permission assignment; adding a read permission set to an already privileged user does not remove their other rights. Do not remove employee roles as part of this package installation. Any identity policy changes require separate administrator review.

## Data flow, ownership and licensing

The OpenAI host communicates directly with Microsoft Entra and Microsoft's hosted BC MCP. Results enter the host/model context and remain subject to the organization's OpenAI and Microsoft data-handling agreements. No third-party community MCP, shared OAuth client, npm code, telemetry, or Anstar-hosted data intermediary is added. Microsoft operates and updates its endpoint; this repository does not pin or redistribute the server. BC entitlements and API availability remain Microsoft's responsibility. Anstar owns the plugin metadata and skill (`UNLICENSED`, matching repository packages).

Do not place ERP response bodies, tokens, personal data, browser profiles or consent artifacts in this public repository. Validation reports contain only sanitized outcomes.

## Verification

```sh
python3 scripts/validate_plugins.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/smoke_business_central.py
```

The smoke script uses disposable HOME/CODEX_HOME/XDG directories, file credential stores and a disabled server. It tests the repository's release hold, then enables **installation only** in a disposable copy to exercise packaging and `mcp get` readback. It never enables the MCP server, starts OAuth, runs a model or accesses BC records. It does not modify the employee's Codex installation. See [verification.md](verification.md) for evidence and remaining gates.

## Troubleshooting

- **Not available / disabled:** intentional release hold, not a reason to bypass it.
- **AADSTS50011:** compare the actual callback with ADMIN-SETUP.md; `oauth.callbackPort` is ignored by Codex 0.146.0. Do not change another plugin or sign in as admin.
- **Admin approval / consent:** send the requested scope to IT; do not add application permissions or secrets.
- **No tools:** check the exact tenant/environment/company/configuration and Dynamic Tool Mode. Do not remove the read allowlist or switch to Production.
- **Write operation appears:** stop. IT must audit the BC configuration. Do not invoke it to test authorization.
- **ChatGPT web:** no verified `.app.json` binding is provided. Desktop marketplace compatibility is not hosted ChatGPT app publication.
