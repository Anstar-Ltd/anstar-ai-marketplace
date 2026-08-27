# Migrate from the combined Sales CRM plugin

The marketplace now separates the reusable source from the seller workflows:

1. **Anstar Dataverse** (`anstar-dataverse`) owns Microsoft OAuth, the official Dataverse MCP connection, generic bounded research, and the canonical CRM read-safety contract.
2. **Anstar Sales** (`anstar-sales`) owns the role-first Sales router and focused seller workflows.
3. **Anstar Sales CRM** (`anstar-sales-crm`) is the legacy combined package retained temporarily for migration.

## Recommended migration sequence

1. Upgrade the `anstar-ai` marketplace.
2. Install **Anstar Dataverse**.
3. Authenticate `anstar-dataverse` with the normal Anstar Microsoft identity when prompted.
4. Install **Anstar Sales**.
5. Start a new chat and run a bounded account or pipeline prompt.
6. Verify the effective Dataverse server exposes only `read_query`, `search`, `search_data`, and `describe` through the local plugin policy.
7. Only after the new pair works, disable or remove the legacy `anstar-sales-crm` package.

## Migration caution

A clean isolated test installed the legacy package and the new Dataverse package together without a server-key error; one effective four-tool `anstar-dataverse` server remained. However, both packages loaded skills named `index` and `crm-read-safety`, making activation ambiguous.

Coexistence is technically tolerated but is not recommended for normal use. The public marketplace keeps the legacy package available during the first migration release, but new users should install **Anstar Dataverse** followed by **Anstar Sales**. Existing users should verify the new pair, then disable or remove `anstar-sales-crm`.

## ChatGPT web

This split proves local marketplace and Codex/Desktop composition. It does not claim that a ChatGPT workspace app has discovered Dataverse actions. A future `.app.json` binding requires a verified, non-empty registered app ID before it is added to the Sales package.
