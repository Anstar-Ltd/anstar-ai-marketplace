---
name: weekly-pipeline-review
description: Review pipeline risks from read-only CRM evidence.
---

# Weekly Pipeline Review

Use this read-only workflow when a seller asks what changed, what needs attention, or where to focus this week.

## Dependency categories

- `CRM` [Blocking]

Resolve `CRM` through `anstar-dataverse` and apply `crm-read-safety`. Do not infer a pipeline from non-CRM sources.

1. Confirm the review period; default to the previous seven days when ambiguous.
2. Resolve the authenticated user's accessible ownership or team scope; never assume organisation-wide access.
3. Use bounded explicit-field queries for open opportunities and relevant recent activity metadata or modifications; default to 50 opportunities.
4. Assess deterministic signals: stale activity, approaching or missed close date, overdue/missing next step, stage inconsistency, material change, and missing key information. This is not predictive forecasting.
5. Return: scope and period; pipeline snapshot; ordered opportunities needing attention; changes; gaps; planning-only next steps.
6. Separate CRM facts from recommendations and preserve blanks honestly.

Never mutate CRM or infer contact without accessible evidence.
