# Business Central administrator handoff

**Status: prerequisites pending; do not release or enable yet.** This handoff is for the authorized Entra/BC administrator, not each employee. No client secret, existing developer CLI login, or shared service identity is needed.

## 1. Register a dedicated public OAuth client

The administrator supplied Application (client) ID **`894473ac-0b35-44de-97f8-c642366fdb43`** and reported API permission/consent setup complete. Interactive sign-in with that ID and the documented callback succeeded in the isolated Codex pilot. The administrator subsequently activated the named BC configuration; authenticated discovery and one-row reads of Items, Item Ledger Entries and Sales Orders now pass. See the verification report for remaining rollout checks. The intended registration name is **Anstar Business Central MCP — Read Only**; its name describes intended MCP configuration, not the breadth of the OAuth grant.

[Open this app's API permissions](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/894473ac-0b35-44de-97f8-c642366fdb43) in the Anstar directory. Do not create a duplicate registration.

| Setting | Value |
| --- | --- |
| Owner | Anstar IT; assign accountable application owners |
| Platform | Mobile and desktop applications / public client |
| Supported accounts | Microsoft's current non-Microsoft MCP guide specifies multiple Entra tenants, work/school accounts only; review this with the admin before creation. Tenant headers alone are not an account restriction. No personal Microsoft accounts. |
| Redirect URI for Codex CLI 0.146.0 | `http://localhost:33418/callback/GNmTSc-BOPT4` |
| API | Dynamics 365 Business Central |
| Delegated permission | `Financials.ReadWrite.All` |
| Consent | Tenant administrator consent to that delegated permission only |
| Application permissions | None |
| Client secrets/certificates | None |
| Implicit access-token / ID-token grants | Off |

Use the resource/scope advertised by Microsoft: `https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All`. The plugin also requests `offline_access` for renewal. Do not add Graph, directory write, application-only `API.ReadWrite.All`, or unrelated integration permissions.

Return the **Application (client) ID**, app ownership and consent confirmation through the private IT ticket. The client ID is public configuration, not a secret. Do not send a token, password or secret. Do not reuse the Dataverse or PnP registration.

Microsoft's current guide requests a multitenant registration. That is a separate trust consideration; approve it deliberately, restrict enterprise-app access as appropriate, and validate the actual identity. If the organization requires single-tenant registration, validate that variant before changing the documented profile rather than silently claiming support.

## 2. Provision the read-only sandbox MCP configuration

Authorized target only:

- Environment: `sandbox-uat-2026-march` (Sandbox).
- Company: `Anstar Ltd`.
- New configuration: `Anstar AI Read Only`.

Find **Model Context Protocol (MCP) Server Configurations** through BC's search. On the inspected sandbox build, page 8350 opened the list and 8351 opened the card; Microsoft documentation currently links 8351 as the list, so prefer the page name over guessing an ID.

Create a **new, non-default** configuration; do not change an existing/default configuration:

| Field | Required value |
| --- | --- |
| Active | On |
| Default | Off |
| Dynamic Tool Mode | On |
| Discover Additional Objects | On |
| Unblock Edit Tools | Off |
| Explicit tool rows | None needed for additional-object discovery; if added, Allow Read only |
| Allow Create / Modify / Delete / Bound Actions | Off on every row |

Review and validate the configuration, close and reopen it, and verify every field. Do not enable edits or posting to test rejection. The user approved this integration-settings change, not business-record writes or Production access.

The agent's earlier visit prompted for **System Application by Microsoft** to contact an unspecified external service; the agent did not grant that prompt or create the configuration. The administrator later reported it active, and MCP initialization/read calls now succeed. Administrator verification of every setting above remains required; a bounded empty write-action search is not a full configuration audit.

BC roles remain additive. Granting a read-only set to a user with broader roles does not remove write access. Keep normal user roles unchanged during plugin deployment; any identity-level restriction is a separate administrator decision. `Financials.ReadWrite.All` is not a read-only token. This MCP configuration narrows operations through this connection, while BC identity permissions set the data-access ceiling.

## 3. Codex 0.146.0 callback compatibility

The release-tag implementation and installed binary support `oauth.client_id` and `http_headers`, but ignore `oauth.callbackPort` and unsupported per-server callback fields. **Two global settings are needed for this tested native path**:

```toml
mcp_oauth_callback_port = 33418
mcp_oauth_callback_url = "http://localhost:33418/callback"
```

The user has not yet approved central deployment of these global settings. Obtain that decision first. IT must merge settings into the correct employee runtime configuration without replacing unrelated content. They affect **all HTTP MCP OAuth logins**; compare existing callbacks (including Dataverse) and register compatible URIs before changing an already configured machine. Keep existing registrations/callbacks intact. If the machine already uses a compatible localhost callback base, assess that existing base instead of silently overwriting it.

Codex appends a URL-derived path component. For the BC endpoint the actual callback is:

`http://localhost:33418/callback/GNmTSc-BOPT4`

Do **not** include the suffix in the global base setting or it will be appended twice. The suffix comes from Base64URL without padding of the first nine SHA-256 bytes of the canonical URL `https://mcp.businesscentral.dynamics.com/`. It is URL-specific, not plugin-name-specific.

Microsoft documents ignoring the port when matching **localhost** callbacks, but Codex's unconfigured default uses `127.0.0.1` with an ephemeral port. Do not generalize localhost matching to that IP literal. A portless localhost registration alone does not fix the default Codex callback.

Desktop Work may run a different bundled runtime. Capture its real authorization request, register its exact required callback and verify the complete flow. Do not assume CLI validation establishes desktop compatibility or silently substitute a hosted ChatGPT callback. No employee CLI installation is needed when IT manages the desktop runtime settings, but that delivery path must be demonstrated before release.

## 4. Activate only in a reviewed pilot

The administrator-supplied public client ID is now packaged in `.mcp.json`:

```json
"oauth": { "client_id": "894473ac-0b35-44de-97f8-c642366fdb43" }
```

The ID is not a credential and is not a placeholder; its presence alone does not prove successful authorization. Keep `http_headers` (not `headers`) and the explicit ConfigurationName. Do not omit the name and fall back to an uncontrolled default.

For an approved isolated pilot only, change `enabled` to true and local marketplace policy to AVAILABLE; keep employee release blocked until all acceptance gates pass. Never add a client secret. Test Microsoft sign-in with a normal user, actual MCP initialization/tools/list, search, describe and one bounded read (at most 1–3 rows and non-sensitive fields). Retain only sanitized success/error evidence. No write denial probe.

Then validate a clean desktop Work installation, Windows compatibility, refresh-token reuse and an account with least-privileged BC access. Verify that the read-only configuration remains unchanged. Only then update the staging tests/manifest copy, enable the distributable entry, remove the staged warning, bump the version, approve the PR and release. This PR must remain draft while those gates are open.

## Sources (reviewed against Codex 0.146.0)

- [Microsoft BC MCP overview](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/ai/mcp-overview)
- [Microsoft non-Microsoft client registration](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/ai/use-mcp-server-non-microsoft)
- [Microsoft read-only and dynamic tool configuration](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/ai/configure-mcp-server)
- [Entra loopback redirect restrictions](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)
- [Codex 0.146.0 plugin parser](https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/codex-mcp/src/plugin_config.rs)
- [Codex 0.146.0 OAuth callback implementation](https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/rmcp-client/src/perform_oauth_login.rs)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
