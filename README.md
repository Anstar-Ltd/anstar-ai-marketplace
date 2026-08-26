# Anstar AI Marketplace

Public marketplace for Anstar plugins, MCP connections, and skills used by ChatGPT Desktop and Codex. The code and connection metadata are public; CRM access still requires an authorized Anstar Microsoft identity.

## Current plugin

### Anstar Sales CRM

Read-only workflows for:

- seller help and orientation through a Sales index/router;
- account-signal analysis and account prioritisation;
- CRM-backed preparation for a named meeting or account;
- weekly pipeline review;
- bounded free-form CRM research with explicit evidence and honest blanks.

The role architecture is a deliberately small adaptation of OpenAI's MIT-licensed Sales role plugin. It keeps focused workflow composition while mapping CRM directly to the existing `anstar-dataverse` MCP; provider placeholders and write-oriented workflows are excluded. Every CRM workflow composes the shared `crm-read-safety` policy. See `THIRD_PARTY_NOTICES.md` for attribution.

The MVP connects to Anstar's official Microsoft Dataverse MCP endpoint and supplies a Codex policy that enables only:

- `read_query`
- `search`
- `search_data`
- `describe`

> **MVP limitation:** the upstream Dataverse server still advertises write tools. Codex tool policy hides/disables those tools locally, but this is not a server-side authorization boundary. Users must retain genuinely read-only Dataverse permissions. A filtered Anstar gateway remains a later hardening task.

## Install in the ChatGPT/Codex app

1. Open **Plugins Directory** in Work or Codex mode.
2. Choose **Add marketplace**.
3. Use source `https://github.com/Anstar-Ltd/anstar-ai-marketplace.git` and Git ref `main`.
4. Select **Anstar AI**, then install **Anstar Sales CRM**.
5. Complete Microsoft sign-in and start a new chat.

The plugin bundles its OAuth client settings, Dataverse scope, and four-tool read policy. Users do not need to edit configuration files. See `docs/INSTALL-FOR-EVERYONE.md` for the click-by-click guide.

CLI equivalent for technical testing:

```bash
codex plugin marketplace add Anstar-Ltd/anstar-ai-marketplace --ref main
codex plugin add anstar-sales-crm@anstar-ai
```

## Verification

```bash
python3 -m unittest tests/test_mvp_contract.py -v
codex plugin list
codex mcp get anstar-dataverse
```

The first real CRM test was completed through the already-authorized Hermes Dataverse client: `describe` plus a bounded `read_query` returned the newest three accessible opportunities. Do not test by creating or updating a record.

Codex OAuth and a bounded live Dataverse read have been verified with the registered callbacks documented in `docs/ENTRA-ADMIN-HANDOFF.md`. Version `0.1.0-mvp.3` also avoids sending a duplicate OAuth resource indicator on clean installations.

## Repository scope

This repository currently proves packaging, installation, skills, the Dataverse connection, and a local read-tool policy. It deliberately does not yet include a production gateway, public deployment, complete privacy/legal metadata, UI, telemetry, or automated role provisioning.
