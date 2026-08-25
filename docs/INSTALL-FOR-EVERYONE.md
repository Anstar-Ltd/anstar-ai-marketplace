# Install Anstar Sales CRM in the ChatGPT/Codex app

This guide is for non-technical Anstar users. No Terminal or GitHub account is required.

## Before you start

- Install or update the ChatGPT desktop app.
- Sign in with the ChatGPT workspace/account you use for work.
- Your Anstar Microsoft account must have the intended CRM read permissions.
- The shared Entra callback configuration is already complete.

## Add the Anstar marketplace

1. Open the ChatGPT desktop app.
2. Switch to **Work** or **Codex** mode.
3. Open **Plugins** / **Plugins Directory**.
4. Open the page actions menu and choose **Add marketplace**.
5. In **Source**, paste:

   ```text
   https://github.com/Anstar-Ltd/anstar-ai-marketplace.git
   ```

6. In **Git ref**, enter:

   ```text
   main
   ```

7. Leave **Sparse paths** empty.
8. Click **Add marketplace**.

The source is public, so the app should not request a GitHub login.

## Install the Sales plugin

1. In the Plugins Directory, choose the **Anstar AI** marketplace.
2. Open **Anstar Sales CRM**.
3. Click **Install** or **Enable**.
4. Complete Microsoft sign-in when prompted, using your normal Anstar account.
5. Fully quit the app with **⌘Q**, reopen it, and start a new chat.

## Try it

Ask one of these:

- “Use Anstar Sales CRM to give me an account brief for RTC Supplying Essentials.”
- “What accessible opportunities need my attention this week?”
- “Summarise meaningful CRM changes over the last seven days. Separate facts from recommendations.”

## What the MVP can do

The plugin bundles a read-only tool policy for:

- `read_query`
- `search`
- `search_data`
- `describe`

It must not create, update, or delete CRM records.

## If it does not work

- **Anstar AI does not appear:** quit with **⌘Q**, reopen the app, then return to Plugins Directory.
- **Marketplace already added:** select the existing **Anstar AI** source rather than adding it again.
- **Microsoft says the redirect URI is invalid:** record the exact message and app version for IT; do not try another account or paste login data into chat.
- **No CRM records appear:** confirm that the signed-in Anstar user can see those records in Dynamics CRM.
- **The plugin changed but looks old:** use the marketplace actions to upgrade/refresh **Anstar AI**, then restart the app.

Do not paste Microsoft passwords, access tokens, or device codes into a chat.
