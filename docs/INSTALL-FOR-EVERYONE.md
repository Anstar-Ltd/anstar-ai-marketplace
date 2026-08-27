# Install Anstar Dataverse and Anstar Sales

This guide is for non-technical Anstar users. No Terminal or GitHub account is required.

## Before you start

- Install or update the ChatGPT desktop app.
- Sign in with the ChatGPT workspace/account you use for work.
- Your normal Anstar Microsoft account must have the intended Dataverse permissions.
- Do not use an Entra administrator account for normal CRM work.

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
4. Fully quit the app with **⌘Q**, reopen it, and start a new chat.

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

## If it does not work

- **Anstar AI does not appear:** quit with **⌘Q**, reopen the app, then return to Plugins Directory.
- **Marketplace already added:** select the existing **Anstar AI** source instead of adding it again.
- **Anstar Sales cannot find CRM:** confirm **Anstar Dataverse** is installed, enabled, and authenticated.
- **Microsoft says the redirect URI is invalid:** record the exact message and app version for IT; do not try another account or paste login data into chat.
- **No CRM records appear:** confirm the signed-in Anstar user can see those records in Dynamics CRM.
- **The plugin changed but looks old:** upgrade or refresh **Anstar AI**, then restart the app.

Do not paste Microsoft passwords, client secrets, access tokens, refresh tokens, or device codes into chat.
