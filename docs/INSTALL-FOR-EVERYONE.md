# Install Anstar AI plugins

This guide is for non-technical Anstar users. No Terminal or GitHub account is required.

## Before you start

- Install or update the ChatGPT desktop app.
- Sign in with the ChatGPT workspace/account you use for work.
- Your normal Anstar Microsoft account must have the intended Dataverse permissions.
- Do not use an Entra administrator account for normal CRM work.
- Use only your own Microsoft, ClickUp, GitHub and Plaud accounts. Plugins do not contain shared credentials.
- Never send a password, access token, client secret or device code to another person or paste one into chat.

## Add the Anstar marketplace

1. Open the ChatGPT desktop app.
2. Switch to **Work** or **Codex** mode.
3. Open **Plugins** / **Plugins Directory**.
4. Open the page actions menu and choose **Add marketplace**.
5. In **Source**, paste:

   ```text
   https://github.com/Anstar-Ltd/anstar-ai-marketplace.git
   ```

6. In **Git ref**, enter `main`.
7. Leave **Sparse paths** empty.
8. Click **Add marketplace**.

The source is public, so the app should not request a GitHub login.

## Install Anstar Dataverse first

1. In the Plugins Directory, choose the **Anstar AI** marketplace.
2. Open **Anstar Dataverse**.
3. Click **Install** or **Enable**.
4. Complete Microsoft sign-in when prompted using your normal Anstar account.

Anstar Dataverse provides the reusable official Microsoft Dataverse MCP connection, bounded research, and the canonical CRM read-safety policy.

## Install Anstar Sales second

1. Return to the **Anstar AI** marketplace.
2. Open **Anstar Sales**.
3. Click **Install** or **Enable**.
4. Fully quit and reopen the app, then start a new chat. On Windows, use **Quit/Exit** rather than only closing the window. On macOS, use **⌘Q**.

Anstar Sales supplies the seller router and workflows. It does not duplicate Microsoft OAuth or the Dataverse MCP connection.

## Try it

Ask one of these:

- “What can Anstar Sales do?”
- “What changed for this account in the last 14 days?”
- “Which accessible accounts should I focus on this week, and why?”
- “Prepare me for my meeting with this customer.”
- “Review my accessible open pipeline for the previous seven days.”

## Read-only MVP boundary

Anstar Dataverse packages a local tool policy for:

- `read_query`
- `search`
- `search_data`
- `describe`

Neither plugin should create, update, or delete CRM records.

## Existing Anstar Sales CRM users

**Anstar Sales CRM** (`anstar-sales-crm`) is the legacy combined package. Do not remove it until the new Anstar Dataverse + Anstar Sales pair has been verified. Follow `docs/PLUGIN-MIGRATION.md` for the migration sequence.

## Optional productivity plugins

The **Anstar AI** marketplace also packages the portable MCP connections used by Anstar. Install only the sources needed for the employee's role:

- **Softeria Microsoft 365** — delegated access to Outlook, Teams, SharePoint and other supported Microsoft 365 services.
- **ClickUp** — ClickUp's hosted connection. Changes to tasks require explicit approval.
- **GitHub** — GitHub's hosted connection for repository reads and approval-gated writes, including issues, file changes and pull requests.
- **Plaud** — the employee's own Plaud recordings, transcripts and notes.

These plugins contain connection metadata only; they do not include passwords, access tokens, tenant secrets, or shared user identities. Business Central is not included in this release.

### Connect Softeria Microsoft 365

1. Install **Softeria Microsoft 365** from **Anstar AI**.
2. Start a new chat and ask: “Check my Microsoft 365 connection.”
3. If sign-in is required, use the URL and one-time code shown by the login tool. Complete the Microsoft page yourself using your normal Anstar account.
4. Ask Codex to verify the connection.
5. Test one Teams item or SharePoint file that you already know you can access.

The plugin includes a `microsoft-365-first` skill. In a new task, Codex should check Softeria before using browser or desktop automation for Outlook, Teams, SharePoint, OneDrive and other Microsoft 365 requests. If Softeria cannot complete the request, Codex should state whether the limitation is availability, authentication, permission or missing capability before suggesting a fallback.

The plugin runs Softeria in organisation mode using delegated Microsoft authentication. It does not use an application secret, an application-only identity, or an administrator account. Microsoft Graph evaluates each request as the signed-in employee:

- if the employee can access a SharePoint site or file normally, the plugin can request it;
- if the employee cannot access that site or file normally, the plugin cannot grant access;
- SharePoint sharing, group membership, sensitivity labels and other Microsoft controls continue to apply;
- write-capable tools retain Codex approval handling and cannot exceed the employee's Microsoft permissions.

Some delegated Microsoft Graph scopes may require Anstar tenant administrator consent. That consent lets the Softeria client request the approved delegated scope; it does not give an employee access to content that their own account cannot access.

### Connect ClickUp

1. Install **ClickUp**.
2. Complete ClickUp sign-in using the employee's own account.
3. Start a new chat and ask: “Show my overdue ClickUp tasks.”
4. Confirm that only the expected ClickUp workspaces are visible.

### Connect GitHub

1. Install **GitHub**.
2. Complete GitHub OAuth using the employee's own GitHub account.
3. Start a new chat and ask it to read a repository that the employee can access.
4. For a write-capability check, ask Codex to describe the GitHub MCP action it would use to create a pull request in a test repository. Approve an actual change only when you intend to make it.

The plugin uses GitHub's official read/write MCP endpoint. Codex approval handling applies to write tools, while the employee's GitHub permissions, branch protection and repository rules remain the final boundary. The bundled `github-first` skill tells Codex to use GitHub MCP before a browser or GitHub CLI and to explain any availability, authentication or capability limitation before suggesting a fallback. GitHub CLI authentication is separate from the GitHub MCP plugin's OAuth and does not sign the plugin in automatically.

### Connect Plaud

1. Install **Plaud**.
2. Start a new chat and ask: “Find my recent Plaud recordings.”
3. Complete Plaud authentication if prompted.
4. Confirm that results belong to the employee's own Plaud account.

## Update an existing installation

When IT announces an Anstar AI update:

1. Open **Plugins Directory** and refresh or upgrade the existing **Anstar AI** marketplace.
2. Fully quit and reopen the app.
3. Start a new chat before testing the updated plugin.

Technical CLI equivalent:

```text
codex plugin marketplace upgrade anstar-ai
```

Softeria and Plaud are pinned to reviewed package versions. An update is delivered by changing the pin in this marketplace, validating it and then refreshing the employee's marketplace snapshot. ClickUp and GitHub maintain their hosted MCP services centrally.

## Employee rollout check

Before broad deployment, IT should complete one clean installation using a second normal employee account and verify:

- Anstar Dataverse returns only records permitted to that employee;
- Softeria can access an expected Teams item and SharePoint file but cannot access an administrator-selected negative test location;
- GitHub OAuth completes and the plugin cannot make repository changes;
- ClickUp and Plaud expose only workspaces or recordings available to the signed-in account;
- no administrator, shared service or developer credential is present on the employee device.

## If it does not work

- **Anstar AI does not appear:** quit with **⌘Q**, reopen the app, then return to Plugins Directory.
- **Marketplace already added:** select the existing **Anstar AI** source instead of adding it again.
- **Anstar Sales cannot find CRM:** confirm **Anstar Dataverse** is installed, enabled, and authenticated.
- **A productivity plugin cannot connect:** confirm the employee completed that service's own sign-in and is entitled to use the account.
- **Teams or SharePoint tools are missing:** refresh **Anstar AI**, confirm Softeria is the marketplace version that runs in organisation mode, then restart the app.
- **Microsoft requests administrator approval:** stop and send the exact consent request to IT. Do not switch to an administrator account.
- **A SharePoint result looks over-broad:** stop using the plugin and report the site, signed-in account and non-sensitive reproduction steps to IT. Do not open or share additional files.
- **Microsoft says the redirect URI is invalid:** record the exact message and app version for IT; do not try another account or paste login data into chat.
- **No CRM records appear:** confirm the signed-in Anstar user can see those records in Dynamics CRM.
- **The plugin changed but looks old:** upgrade or refresh **Anstar AI**, then restart the app.

Do not paste Microsoft passwords, client secrets, access tokens, refresh tokens, or device codes into chat.
