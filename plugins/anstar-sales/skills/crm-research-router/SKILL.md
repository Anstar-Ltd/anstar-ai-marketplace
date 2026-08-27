---
name: crm-research-router
description: Route free-form Sales CRM research within read-only limits.
---

# CRM Research Router

Use this read-only fallback for a Sales CRM question not owned by another focused workflow.

## Dependency categories

- `CRM` [Blocking for authoritative claims]

Prefer `anstar-dataverse` and apply `crm-read-safety`. If CRM is missing, use user-provided evidence only for a clearly labelled partial answer; otherwise offer installation or connection of Anstar Dataverse.

1. Restate the research object, scope, and time window; ask one clarification only when it materially changes the query.
2. Inspect schema before uncertain tables, logical fields, lookups, choices, or relationships.
3. Use bounded read-only discovery and explicit-field ordered retrieval.
4. Default to 25 rows and never exceed 100 in one response.
5. Answer with scope; evidence-backed findings; facts versus interpretation; blanks/conflicts; smallest useful follow-up.
6. Hand off when a focused Sales workflow becomes the clear owner.

Reject write or bulk-export intent. Never claim a CRM change was made.
