---
name: index
description: Route Anstar seller requests to bounded workflows.
---

# Anstar Sales Index

Use this read-only index first for explicit Anstar Sales requests. It routes to focused workflows rather than answering as the final workflow.

## Routes

| Intent | Route |
| --- | --- |
| Help, orientation, examples | `sales-help` |
| Recent account changes or signals | `analyze-account-signals` |
| Accounts needing attention | `prioritize-accounts` |
| Named customer or prospect meeting | `prepare-for-meeting` |
| Weekly pipeline changes and risks | `weekly-pipeline-review` |
| Other bounded CRM question | `crm-research-router` |

## CRM dependency

`CRM` is blocking for authoritative customer, account, opportunity, activity, quote, or pipeline claims. Prefer the installed `anstar-dataverse` plugin/MCP as Anstar's CRM source and apply its canonical `crm-read-safety` policy.

Before declaring CRM missing, check the live tool registry for `anstar-dataverse` and credible category-equivalent CRM tools. If no usable CRM source exists, use equivalent user-provided context only when the focused workflow permits a clearly labelled partial result; otherwise explain the limitation and offer installation or connection of Anstar Dataverse.

Never use browser automation as a substitute for an unavailable CRM source.

## Routing rules

1. Prefer the narrowest focused workflow.
2. One suitable source satisfies `CRM`; do not request another merely because it is more canonical.
3. Use Dataverse as authority for CRM facts and separate facts from recommendations.
4. Missing non-blocking sources produce a useful partial result with explicit gaps.
5. For create, update, delete, send, schedule, or publish requests, stop at a reviewable draft and explain the read-only boundary.
