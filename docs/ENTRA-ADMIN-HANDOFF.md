# Entra callback configuration for Codex MVP login

## Status: completed and verified

Both public-client redirect URIs are registered. Codex OAuth completed successfully and a bounded live Dataverse read was verified through the installed plugin.

## Existing registration

- Display name: `Hermes Dataverse MCP Client`
- Application ID: `65649345-8fb7-477a-820b-5604b5e2afe3`
- Tenant: Anstar tenant
- Existing redirect URI to preserve: `http://localhost:8765/callback`

## Registered callbacks

The application preserves the Hermes callback and includes the Codex callback:

```text
http://localhost:8765/callback
http://localhost:8765/callback/o-fgEqWPEYUK
```

The suffix is Codex's server-specific callback ID for the plugin MCP server named `anstar-dataverse`.

The application already has delegated Dynamics CRM `mcp.tools` configuration used by the working Hermes Dataverse connection. Do not add a client secret; this is a public-client PKCE flow.

## Verified login path

On the pilot Mac:

```bash
codex mcp login anstar-dataverse
codex mcp get anstar-dataverse
```

The verified Microsoft authorization request contained:

- client ID `65649345-8fb7-477a-820b-5604b5e2afe3`;
- redirect URI shown above;
- scope `https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools`;
- PKCE code challenge.

The post-login test used only `describe` and `read_query`, returned three accessible opportunities, and made no changes.

## Administration note

The normal pilot account can read but cannot edit this registration. Future callback changes require an authorized Entra application administrator.
