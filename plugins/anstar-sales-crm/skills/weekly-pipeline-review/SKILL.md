---
name: weekly-pipeline-review
description: Review pipeline changes and priorities from Anstar CRM.
---

Use this read-only skill when a Sales user asks what changed, what needs attention, or where to focus this week.

1. Confirm the review period; default to the previous seven days when the user says “this week” without another range.
2. Use only `search`, `search_data`, `describe`, and `read_query`.
3. Resolve the authenticated user's ownership/team scope from accessible CRM data; do not assume access to the whole organisation.
4. Use bounded, explicit-field queries to collect open opportunities and recent relevant activities or modifications.
5. Prioritise using visible evidence such as stale activity, approaching expected close date, overdue next step, material recent change, or missing key information. Label these as deterministic signals, not a predictive score.
6. Return a short ordered list with account, opportunity, reason, supporting dates/records, and a suggested next step.
7. Separate CRM facts from recommendations and state any incomplete data.

Never mutate CRM. Never infer that a customer was contacted unless an accessible activity proves it.
