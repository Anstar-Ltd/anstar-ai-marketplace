---
name: prioritize-accounts
description: Rank existing accounts using read-only CRM evidence.
---

# Prioritize Accounts

Use this read-only workflow when a seller asks which existing accounts to work now.

## Dependency categories

- `CRM` [Blocking]

Resolve `CRM` through `anstar-dataverse` and apply `crm-read-safety`. Do not invent a candidate universe when CRM is missing.

1. Resolve the requested account list, owner scope, or open-pipeline scope.
2. Default to ten ranked accounts and never retrieve more than 50 without narrowing.
3. Rank with visible deterministic signals: close date, stale activity metadata, overdue or missing next step, material recent change, value, stage, and missing key data.
4. Put each account in one group: **Suggested Focus**, **Monitor**, or **Suppress or Block**.
5. Show why now, relevant opportunity/stage, evidence date or record, suggested next step, and confidence.
6. State the ranking basis and gaps. Missing contacts or activity are gaps, not negative customer signals.

Do not execute outreach or write CRM.
