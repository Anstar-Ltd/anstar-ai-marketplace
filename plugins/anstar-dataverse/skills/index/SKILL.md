---
name: index
description: Route bounded read-only Anstar Dataverse requests.
---

# Anstar Dataverse Index

Use this read-only source index for explicit Anstar Dataverse requests. Apply `crm-read-safety` to every data-backed route.

## Routes

- For source orientation, explain that this plugin provides bounded schema discovery and record research through the installed `anstar-dataverse` MCP.
- For schema, table, relationship, or record questions, use `dataverse-research`.
- For a role-specific business workflow, prefer the relevant installed role plugin and provide Dataverse only as its evidence source.

## Routing rules

1. Use only `search`, `search_data`, `describe`, and `read_query`.
2. Do not implement role-specific ranking, preparation, forecasting, or operational workflows in this source plugin.
3. Inspect schema before uncertain logical names, choices, lookups, or relationships.
4. Keep retrieval bounded and separate returned facts from interpretation.
5. If a request would change data, stop at a reviewable draft and explain the read-only boundary.
