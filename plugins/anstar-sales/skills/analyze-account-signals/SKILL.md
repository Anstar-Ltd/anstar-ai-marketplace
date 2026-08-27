---
name: analyze-account-signals
description: Explain recent account changes from read-only evidence.
---

# Analyze Account Signals

Use this read-only workflow for changes affecting one account or a bounded account set.

## Dependency categories

- `CRM` [Blocking for authoritative claims]

Resolve `CRM` through `anstar-dataverse` when available and apply `crm-read-safety`. Without CRM, proceed only from explicit user-provided evidence and label the result partial.

1. Resolve one account by exact name or stable ID. For a portfolio request, require an owner or explicit list and cap the first pass at 50 accounts.
2. Default to the last 14 days unless the user specifies another period.
3. Use schema-first, explicit-field, bounded read-only queries for account truth, open opportunities, and accessible activity metadata.
4. Treat stage, amount, owner, dates, and status as facts. Tie risk, opportunity, and urgency interpretations to evidence.
5. Do not imply a previous-run delta unless previous-run evidence exists.
6. Return: snapshot; recent signals; why they matter; planning-only next actions; missing evidence.

Do not create monitoring state, tasks, messages, or CRM updates.
