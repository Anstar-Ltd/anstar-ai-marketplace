# Anstar AI Marketplace

Public marketplace for Anstar plugins, MCP connections, and skills used by ChatGPT Desktop and Codex. The code and connection metadata are public; live data access still requires an authorized Anstar Microsoft identity.

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

### Official Microsoft collaboration plugins

The marketplace also carries pinned copies of OpenAI's MIT-licensed official connector packages:

- **Teams** — summarize chats, extract actions, and draft follow-ups through OpenAI's Microsoft Teams connector.
- **SharePoint** — summarize sites, pages, and files and plan safe updates through OpenAI's Microsoft SharePoint connector.

These packages preserve OpenAI's official connector IDs and require each user to connect the relevant Microsoft account when prompted. They do not embed Anstar tenant credentials. An existing Anstar Entra SharePoint MCP registration remains a fallback for a future custom connector if the standard OpenAI connector cannot satisfy the tenant's needs.

## Install in ChatGPT Desktop or Codex

1. Open **Plugins Directory** in Work or Codex mode.
2. Choose **Add marketplace**.
3. Use source `https://github.com/Anstar-Ltd/anstar-ai-marketplace.git` and Git ref `main`.
4. Install **Anstar Dataverse** and complete normal-user Microsoft sign-in.
5. Install **Anstar Sales**.
6. Start a new chat.

See `docs/INSTALL-FOR-EVERYONE.md` for the click-by-click guide.

CLI equivalent for technical testing:

```bash
codex plugin marketplace add Anstar-Ltd/anstar-ai-marketplace --ref main
codex plugin add anstar-dataverse@anstar-ai
codex plugin add anstar-sales@anstar-ai
```

## Verification

```bash
python3 -m unittest tests/test_mvp_contract.py -v
codex plugin list
codex mcp get anstar-dataverse --json
```

A bounded live Dataverse read was previously verified through Codex with the normal delegated Anstar identity. Do not verify by creating or updating a CRM record.

> **MVP limitation:** the upstream Microsoft Dataverse server advertises additional tools. The packaged local policy enables only the four approved reads, while the signed-in user’s Dataverse roles remain the actual data-access boundary.

## ChatGPT web

The two-plugin split currently targets the proven local marketplace/Codex path. A future `.app.json` binding will be added only after a ChatGPT-registered Dataverse app has non-empty action discovery and a verified normal-user read. No zero-action draft ID is packaged.

## Repository scope

This repository proves packaging, installation, source/role composition, skills, connection metadata, and bounded read workflows. It does not yet imply a production gateway, public ChatGPT app publication, complete legal metadata, UI, telemetry, automated role provisioning, or an Ed pilot outcome.
