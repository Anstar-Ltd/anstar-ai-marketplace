# Entra admin handoff for Codex MVP login

## Existing registration

- Display name: `Hermes Dataverse MCP Client`
- Application ID: `65649345-8fb7-477a-820b-5604b5e2afe3`
- Tenant: Anstar tenant
- Existing redirect URI to preserve: `http://localhost:8765/callback`

## Change required

Add this additional **Mobile and desktop applications / public client** redirect URI without removing the existing Hermes URI:

```text
http://localhost:8765/callback/o-fgEqWPEYUK
```

The suffix is Codex's server-specific callback ID for the plugin MCP server named `anstar-dataverse`.

The application already has delegated Dynamics CRM `mcp.tools` configuration used by the working Hermes Dataverse connection. Do not add a client secret; this is a public-client PKCE flow.

## Verification after the change

On the pilot Mac:

```bash
codex mcp login anstar-dataverse
codex mcp get anstar-dataverse
```

The Microsoft authorization request should contain:

- client ID `65649345-8fb7-477a-820b-5604b5e2afe3`;
- redirect URI shown above;
- scope `https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools`;
- PKCE code challenge.

Finish with a harmless bounded read. Do not test authentication by creating or updating CRM data.

## Permission boundary encountered

The normal pilot account can read this app registration but received `Insufficient privileges to complete the operation` when attempting to add the redirect. An authorized Entra application administrator must make the change.
