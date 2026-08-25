# Future fallback: conversational self-setup assistant

If the click-only marketplace flow is unavailable or unreliable on a user's app version, provide a setup plugin/skill that lets the user ask:

> “Set up Anstar Sales CRM for me.”

## Intended behaviour

The assistant should:

1. Check the ChatGPT/Codex app version and plugin support.
2. Check whether the `anstar-ai` marketplace is already registered.
3. Add or refresh the public marketplace through the app/host integration.
4. Install and enable `anstar-sales-crm`.
5. Verify that the bundled MCP policy enables only `read_query`, `search`, `search_data`, and `describe`.
6. Start the native Microsoft OAuth flow and stop while the user completes sign-in.
7. Verify authentication without printing tokens.
8. Run a harmless bounded CRM read.
9. Explain any blocker in plain language and identify whether the user, IT, or an Entra administrator needs to act.
10. Offer uninstall/retry without leaving duplicate MCP registrations or login processes.

## User interaction rules

- Ask only questions that change the setup path.
- Never ask for a Microsoft password, access token, client secret, device code, or recovery code in chat.
- Use native masked/browser authentication.
- Show progress as short stages: Marketplace → Plugin → Microsoft sign-in → Read-only check → Test.
- Stop on permission boundaries instead of seeking elevation.

## Implementation options

1. **Workspace-published bootstrap plugin:** best experience after an admin publishes it to the ChatGPT workspace.
2. **Double-click macOS installer:** registers the public marketplace and opens the Plugins Directory; useful when no marketplace GUI exists.
3. **Managed Codex requirements/profile:** centrally supplies the marketplace and plugin policy for organisation-managed devices.

This is intentionally deferred until the public GUI installation has been tested with Mohamed and Ed.
