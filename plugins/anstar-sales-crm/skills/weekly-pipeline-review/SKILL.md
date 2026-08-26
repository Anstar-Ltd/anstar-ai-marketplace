---
name: weekly-pipeline-review
description: Review Anstar pipeline risks from read-only CRM evidence.
---

# Weekly Pipeline Review

Use this read-only workflow when a seller asks what changed, what needs attention, or where to focus this week. Compose `crm-read-safety` and use `anstar-dataverse` as the pipeline source.

1. Confirm the review period; default to the previous seven days when “this week” is otherwise ambiguous.
2. Resolve the authenticated user's accessible ownership or team scope. Do not assume organisation-wide access.
3. Use bounded, explicit-field queries for open opportunities and relevant recent activities or modifications; default to 50 opportunities and narrow before expanding.
4. Assess visible deterministic signals: stale activity, approaching or missed expected close date, overdue or missing next step, stage inconsistency, material recent change, and missing key information. This is not a predictive forecast.
5. Return: scope and period; pipeline snapshot; ordered opportunities needing attention; meaningful changes; evidence gaps; and suggested planning-only next steps.
6. Show account, opportunity, owner, stage/status, close date, reason, supporting date/record, and confidence when available.

Never mutate CRM or infer contact without an accessible activity proving it. Separate CRM facts from recommendations.
