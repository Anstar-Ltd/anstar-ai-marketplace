---
name: microsoft-365-first
description: Use Softeria Microsoft 365 before browser or desktop automation for Outlook, email, calendars, Teams, SharePoint, OneDrive, Excel and other Microsoft 365 tasks. Start Softeria's device-code sign-in when needed and report any availability, authentication, permission or capability limitation before considering a fallback.
---

# Microsoft 365 first

For a task involving a Microsoft 365 service, inspect and use the Softeria tools exposed as `mcp__ms365__*` before opening a browser, controlling Chrome or using desktop automation.

## Route the request

1. Check that Softeria tools are available in the current task. If connection or account state is unclear, use `mcp__ms365__verify_login`. Do not stop at an unauthenticated result.
2. If verification says the user is not logged in, or the user asks to connect or sign in, call `mcp__ms365__login` with `force: false`. The login tool checks for a valid cached session before starting a new device-code flow.
3. When the login tool returns `device_code_required`, show the Microsoft verification URL and one-time device code to the current user exactly once. Tell them to open the URL, enter the code and sign in with their own Anstar Microsoft account. Never ask them to paste their password or the completed code back into chat.
4. Pause while the user completes the Microsoft page. After they confirm it is complete, call `mcp__ms365__verify_login`. Do not report the plugin as connected until that check returns success. If Microsoft requests administrator approval, stop and report the exact consent requirement to Anstar IT; do not switch to an administrator account.
5. When multiple accounts are configured, use `mcp__ms365__list_accounts` and ask which account to use if the request does not identify one. Do not guess.
6. Select the narrowest tool that performs the requested operation. Treat each tool's current description and parameter schema as the source of truth.
7. If the server exposes discovery tools instead of named Microsoft Graph tools, use `mcp__ms365__search_tools`, then `mcp__ms365__get_tool_schema`, then `mcp__ms365__execute_tool`. Search again with shorter service or action terms if the first query finds nothing.
8. Use a browser or desktop control only when Softeria is unavailable, cannot be authenticated, lacks the required operation, fails after a reasonable attempt, or the user specifically needs the Microsoft user interface. State the precise limitation before falling back.

Typical routing includes:

- Outlook email, mailboxes, contacts and calendars
- Teams chats, channels, meetings, transcripts and recordings
- SharePoint sites, lists, libraries and files
- OneDrive files and folders
- Excel workbooks, OneNote, Planner and Microsoft To Do

Teams and SharePoint require Softeria organisation mode. If Outlook or OneDrive tools are present but Teams or SharePoint tools are missing, report that the plugin may be running in personal mode and recommend refreshing the Anstar AI marketplace plugin, restarting Codex and testing in a new task.

## Access and changes

- Use the signed-in employee's delegated permissions. A missing or denied result may reflect authentication, tenant consent, Microsoft Graph scope or the employee's own access; distinguish these before concluding that the content does not exist.
- Resolve recipients, users, sites, teams, channels, drives and item identifiers with read tools rather than inventing addresses or IDs.
- Read-only investigation does not authorise sending, posting, sharing, deleting or changing Microsoft 365 data. Perform a write only when the user's request includes it, verify the target and honour any confirmation or approval gate.
- Never expose access tokens, refresh tokens, passwords or other persistent credentials. A one-time device code may be shown once only as part of the live `login` flow, because the employee must enter it on Microsoft's verification page; do not store, repeat or request it from the user.
