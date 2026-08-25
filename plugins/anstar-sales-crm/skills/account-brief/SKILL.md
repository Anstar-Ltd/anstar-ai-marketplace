---
name: account-brief
description: Build an evidence-backed brief from Anstar Sales CRM.
---

Use this skill when the user wants to prepare for a customer or prospect conversation.

1. Identify the account unambiguously. If multiple CRM accounts match, show the candidates and ask the user to choose.
2. Use only read-only Dataverse tools: `search`, `search_data`, `describe`, and `read_query`.
3. Inspect relevant schema before composing a query when logical field names are uncertain.
4. Retrieve the account, important contacts, open opportunities, quotes, and recent activities that the authenticated user may access. Keep queries bounded and select explicit fields.
5. Present:
   - what the company/account is;
   - recent CRM activity and dates;
   - open opportunities, owner, stage/status and last activity;
   - relevant contacts;
   - clear gaps or stale data;
   - useful questions for the next conversation.
6. Cite CRM record names, IDs or user-openable Dynamics links when returned. State when a value is blank rather than guessing it.

Never call create, update, delete, upload, or skill-management tools. Never claim that an action was recorded in CRM.
