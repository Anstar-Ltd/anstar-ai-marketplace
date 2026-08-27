# Spike 002: Dataverse and Sales plugin composition

## Question

Can Codex install a reusable Anstar Dataverse source and an independent Anstar Sales role plugin without duplicating the MCP server, losing the four-tool policy, or relying on an existing local cache?

## Method

All tests used fresh temporary `CODEX_HOME` directories and the local implementation worktree as the marketplace source. No existing user credentials, plugin cache, OAuth token, or live CRM query was used.

The following sanitized installation shapes were tested:

1. Anstar Dataverse only
2. Anstar Sales only
3. Anstar Dataverse plus Anstar Sales
4. Legacy Anstar Sales CRM plus new Anstar Dataverse

Commands were equivalent to:

```text
codex plugin marketplace add <local-marketplace> --json
codex plugin add <plugin>@anstar-ai --json
codex plugin list
codex mcp get anstar-dataverse --json
```

## Results

### Dataverse only

- Installed and enabled as `anstar-dataverse@anstar-ai` version `0.1.0-mvp.1`.
- Authentication policy: `ON_INSTALL`.
- Cached exactly three source skills: `index`, `crm-read-safety`, and `dataverse-research`.
- Registered one enabled `anstar-dataverse` streamable HTTP server.
- Effective enabled tools were exactly `read_query`, `search`, `search_data`, and `describe`.

### Sales only

- Installed and enabled as `anstar-sales@anstar-ai` version `0.1.0-mvp.1`.
- Authentication policy: `ON_USE`.
- Cached exactly seven role workflow skills.
- Created no MCP server.
- This confirms the Sales package does not own OAuth or the Dataverse connection.

### Dataverse plus Sales

- Both plugins installed and enabled cleanly.
- Cached all three Dataverse skills and all seven Sales skills in the same runtime inventory.
- Exactly one effective `anstar-dataverse` MCP server was present.
- The effective enabled-tool set remained the four approved reads.
- No duplicate server error or policy widening occurred.

This proves package-level source/role composition. A prompt-level authenticated test remains required to prove that a Sales workflow follows the Dataverse-owned safety skill during a real request.

### Legacy plus new Dataverse

- Both packages installed without a server-key error.
- One effective four-tool `anstar-dataverse` server remained.
- However, duplicate skill names such as `index` and `crm-read-safety` were loaded from both packages.

Coexistence is technically tolerated but is not recommended for normal use because duplicate workflow/safety skill names can make activation ambiguous. Verify the new pair, then disable or remove the legacy package.

## Security and privacy

The clean-install and coexistence phases used no OAuth login or live CRM query. The later bounded verification used per-user OAuth and a live read, but retained no customer name, record identifier, token, client secret, or returned CRM value. The endpoint, public client ID, scope, plugin versions, tool names, and package paths are public connection/package metadata.

## Verdict

**PASS for clean package composition and bounded live use.** Anstar Dataverse and Anstar Sales can be installed independently or together; the source plugin owns the single MCP server and the role plugin supplies workflows.

## Bounded authenticated verification

A disposable Codex home used the existing Anstar pool API route so the test did not consume or depend on the normal ChatGPT subscription quota. The disposable home installed both public plugins, completed per-user Dataverse OAuth, and was deleted after the run.

The live prompt requested at most three accessible open opportunities and prohibited sensitive output and all writes. Codex reported:

- result: `PASS`;
- Sales skill followed: `weekly-pipeline-review`;
- Dataverse skill followed: `crm-read-safety`;
- MCP tools called: `describe`, then `read_query`;
- accessible rows returned: yes;
- selected evidence contained a blank: yes, preserved honestly;
- blocker class: none;
- mutation tools called: none.

No customer or opportunity names, record identifiers, emails, phone/address data, notes, bodies, attachments, tokens, secrets, or raw records are retained in this evidence. This verifies prompt-level cross-plugin skill composition, not merely package installation.