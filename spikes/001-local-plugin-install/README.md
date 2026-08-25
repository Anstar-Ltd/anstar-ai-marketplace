# 001: Local Sales CRM plugin installation

## Question

Given a local Anstar marketplace, when Codex installs the Sales CRM plugin, does it materialise the skills and Dataverse MCP dependency without embedding credentials?

## Evidence

- `codex plugin marketplace add` registered marketplace `anstar-ai`.
- `codex plugin add` installed `anstar-sales-crm@anstar-ai` at version `0.1.0-mvp.1`.
- The installed cache contains all three `SKILL.md` files.
- `codex mcp get anstar-dataverse` resolves the official remote endpoint.
- Local contract suite: four tests pass.

## Verdict: PARTIAL

### What worked

- Marketplace discovery, plugin installation, skill caching, and MCP registration work.
- The local policy enables only `read_query`, `search`, `search_data`, and `describe`.
- A live bounded Dataverse verification succeeded through the already-authorized Hermes client. It used `describe` followed by `read_query` and returned the newest three accessible opportunities with owners, accounts, state/status, and timestamps.

### What remains

- Fresh Codex OAuth is blocked because Dataverse does not support dynamic client registration and the pre-registered Entra application's fixed callback does not match Codex's appended callback path.
- ChatGPT Desktop visual installation should be checked after restart.
- A second-user GitHub/workspace installation is not yet tested.

### Recommendation

Use this package for the local tracer bullet and solve the smallest compatible Entra/ChatGPT connection route next. Do not distribute it as a production read-only security product until server-side filtering or equivalent authorization is implemented.
