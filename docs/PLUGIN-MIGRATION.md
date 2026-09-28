# Migrate from the combined Sales CRM plugin

The marketplace now separates the reusable source from the seller workflows:

1. **Anstar Dataverse** (`anstar-dataverse`) owns delegated Microsoft device-code sign-in, the official Dataverse MCP connection, generic bounded research, and the canonical CRM read-safety contract.
2. **Anstar Sales** (`anstar-sales`) owns the role-first Sales router and focused seller workflows.
3. **Anstar Sales CRM** (`anstar-sales-crm`) is the legacy combined package. It is no longer listed in the marketplace, though its source remains in this repository for existing installations and migration reference.

## Recommended migration sequence

1. Upgrade the `anstar-ai` marketplace.
2. Install **Anstar Dataverse**.
3. On the first Dataverse request, open the Microsoft link Codex shows in chat, enter its one-time code and sign in with the normal Anstar Microsoft identity.
4. Install **Anstar Sales**.
5. Start a new chat and run a bounded account or pipeline prompt.
6. Verify the local server exposes `dv_status`, `dv_connect`, `dv_tools` and `dv_call`, and that `dv_call` dispatches only `read_query`, `search`, `search_data` and `describe`.
7. Only after the new pair works, disable or remove the legacy `anstar-sales-crm` package.

## Migration caution

The old HTTP OAuth package and this adapter use the same plugin name and server key. Refresh the marketplace and reinstall the new package rather than keeping both versions. The legacy combined Sales CRM package also loads skills named `index` and `crm-read-safety`, which can make activation ambiguous.

Coexistence is technically tolerated but is not recommended for normal use. New users should install **Anstar Dataverse** followed by **Anstar Sales**. Existing users should verify the new pair, then disable or remove `anstar-sales-crm`. Removing the marketplace listing does not uninstall an existing installation.

## ChatGPT web

This split proves local marketplace and Codex/Desktop composition. It does not claim that a ChatGPT workspace app has discovered Dataverse actions. A future `.app.json` binding requires a verified, non-empty registered app ID before it is added to the Sales package.
