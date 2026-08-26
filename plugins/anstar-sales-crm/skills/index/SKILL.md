---
name: index
description: Route Anstar seller requests to bounded read-only workflows.
---

# Anstar Sales Index

Use this read-only index first for explicit Anstar Sales requests and clear seller intent. It is a router, not the final workflow. Read the available skill descriptions, choose the narrowest matching workflow, and apply `crm-read-safety` to every CRM-backed route.

## Routes

| Intent | Route |
| --- | --- |
| What can Sales do, help, orientation, examples | `sales-help` |
| What changed for one account or a bounded account set | `analyze-account-signals` |
| Which existing accounts need attention now | `prioritize-accounts` |
| Prepare for a named customer or prospect meeting | `prepare-for-meeting` |
| Review this week's open pipeline and risks | `weekly-pipeline-review` |
| Other free-form CRM question within the read boundary | `crm-research-router` |

## Routing rules

1. Prefer a focused workflow over answering through this index.
2. Use only the installed `anstar-dataverse` source for CRM truth. Do not look for Salesforce, HubSpot, enrichment, calendar, email, transcript, or messaging providers in this MVP.
3. If a request spans routes, start with the route that owns the requested deliverable and compose another only when it materially improves the answer.
4. If the request asks to create, update, delete, send, schedule, or publish, stop at a reviewable draft and explain that the installed plugin is read-only.
5. Preserve evidence links or record identifiers when returned, distinguish facts from inference, and state blanks and unavailable evidence honestly.
