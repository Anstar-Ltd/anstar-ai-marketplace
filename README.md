# Anstar AI Marketplace

Private MVP marketplace for Anstar plugins, MCP connections, and skills used by ChatGPT Desktop and Codex.

## Current plugin

### Anstar Sales CRM

Read-only workflows for:

- customer/account briefs;
- weekly pipeline review;
- bounded CRM research with explicit evidence and honest blanks.

The MVP connects to Anstar's official Microsoft Dataverse MCP endpoint and supplies a Codex policy that enables only:

- `read_query`
- `search`
- `search_data`
- `describe`

> **MVP limitation:** the upstream Dataverse server still advertises write tools. Codex tool policy hides/disables those tools locally, but this is not a server-side authorization boundary. Users must retain genuinely read-only Dataverse permissions. A filtered Anstar gateway remains a later hardening task.

## Local install

```bash
codex plugin marketplace add /absolute/path/to/anstar-ai-marketplace
codex plugin add anstar-sales-crm@anstar-ai
codex mcp login anstar-dataverse
```

Then merge the plugin-scoped policy from `config/codex-readonly-policy.toml` into `~/.codex/config.toml` and restart ChatGPT Desktop/Codex.

For a GitHub-backed install later:

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

Fresh Codex OAuth remains blocked until its callback and requested `mcp.tools` scope are made compatible with an approved Entra public-client registration.

## Repository scope

This repository currently proves packaging, installation, skills, the Dataverse connection, and a local read-tool policy. It deliberately does not yet include a production gateway, public deployment, complete privacy/legal metadata, UI, telemetry, or automated role provisioning.
