---
name: index
description: Route bounded read-only Anstar Dataverse requests.
---

# Anstar Dataverse Index

Use this read-only source index for explicit Anstar Dataverse requests. Apply `crm-read-safety` to every data-backed route. The plugin exposes `dv_status`, `dv_connect`, `dv_tools` and `dv_call` through a stdio adapter.

## Routes

- For source orientation, explain that this plugin provides bounded schema discovery and record research through the installed `anstar-dataverse` MCP.
- For schema, table, relationship, or record questions, use `dataverse-research`.
- For a role-specific business workflow, prefer the relevant installed role plugin and provide Dataverse only as its evidence source.

## Routing rules

1. Call `dv_status` first. If authentication is needed, call `dv_connect` and show its Microsoft verification URL and code in chat on this first Dataverse request; wait for the user to complete sign-in. A direct unauthenticated `dv_tools` or `dv_call` response also includes the link and code.
2. Call `dv_tools` to inspect the live schemas, then use `dv_call` only for `search`, `search_data`, `describe`, and `read_query`.
3. Do not implement role-specific ranking, preparation, forecasting, or operational workflows in this source plugin.
4. Inspect schema before uncertain logical names, choices, lookups, or relationships.
5. Keep retrieval bounded and separate returned facts from interpretation.
6. If a request would change data, stop at a reviewable draft and explain the read-only boundary.
