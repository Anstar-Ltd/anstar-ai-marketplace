# Anstar AI Marketplace

Public marketplace for Anstar plugins, MCP connections, and skills used by ChatGPT Desktop and Codex. The code and connection metadata are public; live data access still requires authorised credentials for the relevant service.

## Current products

### Anstar Dataverse

Reusable read-only source plugin for:

- Microsoft’s official Dataverse MCP endpoint;
- per-user Microsoft OAuth;
- schema-first bounded Dataverse research;
- shared CRM evidence, privacy, blank-handling, and read-safety rules.

Its local Codex policy enables only:

- `read_query`
- `search`
- `search_data`
- `describe`

### Anstar Sales

Role-first seller workflows for:

- help and orientation through a Sales index/router;
- account-signal analysis and account prioritisation;
- preparation for a named customer or prospect meeting;
- weekly pipeline review;
- bounded free-form CRM research.

Anstar Sales is a deliberately small adaptation of OpenAI’s MIT-licensed Sales role plugin. It resolves the abstract `CRM` source through the installed **Anstar Dataverse** plugin and does not duplicate OAuth or MCP configuration. See `THIRD_PARTY_NOTICES.md` for attribution.

### Legacy migration package

**Anstar Sales CRM** (`anstar-sales-crm`) is the previous combined package. It remains available temporarily for migration but is not the recommended path for new installs. See `docs/PLUGIN-MIGRATION.md`.

### Shared productivity plugins

The marketplace packages Anstar's portable MCP connections as installable plugins:

- **Softeria Microsoft 365** — delegated work-account access through Softeria's MCP server in organisation mode, pinned to version `0.148.2`; each employee signs in with their own Microsoft account and retains the same Microsoft 365 access boundary.
- **ClickUp** — ClickUp's official Codex app binding and hosted MCP endpoint with per-user authentication and Codex approval handling for task updates.
- **GitHub** — GitHub's official hosted MCP endpoint for repository reads and approval-gated writes, including issues, file changes and pull requests.
- **Plaud** — Plaud recordings, transcripts, and notes through the npm MCP package pinned to version `0.3.10`.
- **TalentHR** — a local allow-listed wrapper for TalentHR's documented public API, with bounded reads and approval-gated writes using an externally configured API key.

These wrappers contain no user credentials or access tokens. Authentication and effective data access remain tied to each employee's account. Business Central is intentionally excluded from this marketplace release.

### Microsoft 365 employee boundary

The Softeria plugin uses interactive delegated authentication. It does not contain an Anstar client secret, an application-only token, or a shared service identity. Microsoft Graph evaluates every Outlook, Teams, SharePoint and OneDrive request as the employee who signed in. A user cannot use this plugin to read a SharePoint site or file that their Microsoft account cannot access normally.

Organisation mode preserves Softeria's current read and write capabilities. Codex still applies approval handling to write tools, and Microsoft 365 permissions remain the final authorization boundary.

The bundled `microsoft-365-first` skill tells Codex to check Softeria before browser or desktop automation for Outlook, Teams, SharePoint, OneDrive and other Microsoft 365 work. On a new employee's first use, it starts Softeria's device-code login, presents the Microsoft URL and one-time code, then verifies the connection before continuing. The plugin deliberately omits Softeria's `--auth-browser` option because its localhost callback can fail when that redirect URI is not registered. It also requires Codex to explain any connection, authentication, permission or capability limitation before using a fallback.

The bundled `github-first` skill applies the same direct-integration rule to GitHub. Codex should use GitHub MCP before a browser or GitHub CLI, keep writes within the user's requested scope and report any connection, authentication or capability limitation before suggesting a fallback.

## Install in ChatGPT Desktop or Codex

1. Open **Plugins Directory** in Work or Codex mode.
2. Choose **Add marketplace**.
3. Use source `https://github.com/Anstar-Ltd/anstar-ai-marketplace.git` and Git ref `main`.
4. Install **Anstar Dataverse** and complete normal-user Microsoft sign-in.
5. Install **Anstar Sales**.
6. Install **Softeria Microsoft 365**, start a new chat and select **Connect my Microsoft 365 account using device-code sign-in**. Installing this local MCP does not itself open Microsoft sign-in; authentication starts on first use through Softeria's `login` tool.

See `docs/INSTALL-FOR-EVERYONE.md` for the click-by-click guide.

CLI equivalent for technical testing:

```bash
codex plugin marketplace add Anstar-Ltd/anstar-ai-marketplace --ref main
codex plugin add anstar-dataverse@anstar-ai
codex plugin add anstar-sales@anstar-ai
codex plugin add ms-365-mcp-server@anstar-ai
codex plugin add clickup@anstar-ai
codex plugin add github@anstar-ai
codex plugin add plaud@anstar-ai
codex plugin add talenthr@anstar-ai
```

## Updating employee installations

Softeria and Plaud use reviewed, pinned npm releases. ClickUp and GitHub use vendor-hosted MCP endpoints. TalentHR uses the bundled local wrapper and inherits `TALENTHR_API_KEY` from the Codex process environment. After a marketplace release, refresh **Anstar AI**, fully quit and reopen the desktop app, then start a new chat.

CLI equivalent:

```bash
codex plugin marketplace upgrade anstar-ai
```

Existing authentication normally remains local to the employee. A vendor permissions change may require that person to sign in or consent again.

## Verification

```bash
python3 scripts/validate_plugins.py
python3 -m unittest tests/test_mvp_contract.py -v
python3 -m unittest tests/test_employee_rollout.py -v
codex plugin list
codex mcp get anstar-dataverse --json
```

A bounded live Dataverse read was previously verified through Codex with the normal delegated Anstar identity. Do not verify by creating or updating a CRM record.

> **MVP limitation:** the upstream Microsoft Dataverse server advertises additional tools. The packaged local policy enables only the four approved reads, while the signed-in user’s Dataverse roles remain the actual data-access boundary.

## ChatGPT web

The two-plugin split currently targets the proven local marketplace/Codex path. A future `.app.json` binding will be added only after a ChatGPT-registered Dataverse app has non-empty action discovery and a verified normal-user read. No zero-action draft ID is packaged.

## Repository scope

This repository proves packaging, installation, source/role composition, skills, connection metadata, automated package validation, and bounded read workflows. It does not yet imply a production gateway, public ChatGPT app publication, complete legal metadata, UI, telemetry, automated role provisioning, or a completed employee-wide pilot.
