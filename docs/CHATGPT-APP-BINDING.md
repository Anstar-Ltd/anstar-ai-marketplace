# Future ChatGPT app binding

The current product split is verified through the local marketplace/Codex plugin path. Do not add a ChatGPT `.app.json` mapping merely because a workspace draft exists.

## Intended mapping

Once a working registered Dataverse app exists, Anstar Sales can map it to the abstract `CRM` category:

```json
{
  "apps": {
    "anstar_dataverse": {
      "id": "plugin_asdk_app_<verified-working-id>",
      "category": "CRM"
    }
  }
}
```

## Activation gate

Do not create `plugins/anstar-sales/.app.json` until all are true:

- ChatGPT action discovery is non-empty.
- A normal delegated Anstar user completes an authenticated read.
- The technical `plugin_asdk_app_…` ID is read from the working app URL.
- The draft is privately testable in ordinary ChatGPT web.
- The ID is intended to remain stable.
- Workspace publication is explicitly approved.

A draft that reports no actions does not satisfy this gate and its ID must not be packaged.

## Future source categories

Anstar Sales may later compose:

- `CRM` → Anstar Dataverse
- `Calendar` → Outlook Calendar
- `Email` → Outlook Email
- `Internal Messaging` → Teams
- `Knowledge & Files` → SharePoint
- `Meeting Transcripts` → an approved transcript source
- `ERP` → a future Anstar Business Central plugin/app

Do not publish placeholder or unverified connector IDs. Missing non-blocking categories should produce a useful partial result and explicit evidence gaps rather than preventing the first response.
