# Future fallback: conversational self-setup assistant

If the click-only marketplace flow is unavailable or unreliable on a user's app version, provide a setup plugin/skill that lets the user ask:

> “Set up Anstar Dataverse and Anstar Sales for me.”

## Intended behaviour

The assistant should:

1. Check the ChatGPT/Codex app version and plugin support.
2. Check whether the `anstar-ai` marketplace is already registered.
3. Add or refresh the public marketplace through the app/host integration.
4. Install and enable `anstar-dataverse`, then `anstar-sales`.
5. Verify that the adapter exposes only `dv_status`, `dv_connect`, `dv_tools`, and `dv_call`, with `dv_call` restricted to `read_query`, `search`, `search_data`, and `describe`.
6. Start device-code sign-in on first Dataverse use, show the Microsoft link and one-time code in chat, and wait while the user completes sign-in.
7. Verify authentication without printing tokens.
8. Run a harmless bounded CRM read.
9. Explain any blocker in plain language and identify whether the user, IT, or an Entra administrator needs to act.
10. Offer uninstall/retry without leaving duplicate MCP registrations or login processes.

## User interaction rules

- Ask only questions that change the setup path.
- Never ask the user to disclose a Microsoft password, access token, client secret, device code, or recovery code in chat. Show the code returned by the adapter so they can enter it directly on Microsoft's page.
- Show progress as short stages: Marketplace → Dataverse and Sales → Microsoft sign-in → Read-only check → Test.
- Stop on permission boundaries instead of seeking elevation.

## Implementation options

1. **Workspace-published bootstrap plugin:** best experience after an admin publishes it to the ChatGPT workspace.
2. **Double-click macOS installer:** registers the public marketplace and opens the Plugins Directory; useful when no marketplace GUI exists.
3. **Managed Codex requirements/profile:** centrally supplies the marketplace and plugin policy for organisation-managed devices.

This is intentionally deferred until the public GUI installation has been tested with Mohamed and Ed.
