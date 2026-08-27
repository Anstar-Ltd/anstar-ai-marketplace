---
name: dataverse-research
description: Research Anstar Dataverse with bounded read-only queries.
---

# Dataverse Research

Use this read-only workflow for a bounded schema or record question that is not owned by a more specific installed role plugin. Compose `crm-read-safety` and route all operations to `anstar-dataverse`.

1. Restate the requested object, scope, and time window. Use an obvious bounded default when safe; ask one clarification only when ambiguity materially changes the query.
2. Use `describe` before querying when tables, logical field names, lookups, choices, or relationships are uncertain.
3. Prefer `search` for schema discovery and `read_query` for explicit-field, ordered retrieval. Use `search_data` only for a narrow discovery need that cannot be expressed reliably otherwise.
4. Default to 25 rows. Never exceed 100 rows in one response; ask the user to narrow the request or explicitly request another bounded page.
5. Never use `SELECT *`, broad personal-data retrieval, or a mutation tool.
6. Return: scope; evidence-backed findings; facts versus interpretation; blanks or conflicts; and the smallest useful follow-up.

Do not apply seller, operational, financial, or other role-specific prioritisation rules. Hand off to an installed role plugin when a focused workflow clearly owns the requested outcome.
