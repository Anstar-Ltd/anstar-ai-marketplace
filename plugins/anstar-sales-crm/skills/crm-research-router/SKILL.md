---
name: crm-research-router
description: Route free-form Anstar CRM research within read-only limits.
---

# CRM Research Router

Use this read-only fallback for a CRM question not owned by account signals, prioritisation, meeting preparation, or weekly pipeline review. Compose `crm-read-safety` and route CRM operations only to `anstar-dataverse`.

1. Restate the requested research object, scope, and time window. Use an obvious bounded default when safe; ask one clarification only when ambiguity changes the query materially.
2. Inspect schema with `describe` when tables, logical field names, lookups, choices, or relationships are uncertain.
3. Prefer `search` or `search_data` for discovery and `read_query` for explicit-field, ordered, bounded retrieval.
4. Default to 25 rows. Never exceed 100 rows in one response; ask the user to narrow or explicitly request another bounded page.
5. Answer with: scope; evidence-backed findings; facts versus interpretation; blanks/conflicts; and the smallest useful follow-up.
6. When a focused workflow becomes the clear owner, hand off to it rather than duplicating its contract.

Reject write or bulk-export intent. Offer a reviewable draft or narrower read-only question instead. Never claim a CRM change was made.
