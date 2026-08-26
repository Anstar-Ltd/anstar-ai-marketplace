---
name: prioritize-accounts
description: Rank existing Anstar accounts using read-only CRM evidence.
---

# Prioritize Accounts

Use this read-only workflow when a seller asks which existing accounts to work now. Compose `crm-read-safety`; `anstar-dataverse` owns the candidate universe and CRM truth.

1. Resolve the seller's requested account list, owner scope, or open-pipeline scope. Never invent a candidate universe from outside CRM.
2. Keep the result executable: default to ten ranked accounts and never retrieve more than 50 without narrowing the scope.
3. Rank with visible deterministic signals: approaching close date, stale activity, overdue or missing next step, material recent change, deal value, stage, and missing key data.
4. Put each account in exactly one group: **Suggested Focus**, **Monitor**, or **Suppress or Block**. Suppress when ownership is ambiguous, the opportunity is closed, or accessible evidence shows no safe seller action.
5. For every row show account, why now, opportunity/stage when available, evidence date or record, suggested next step, and confidence.
6. State the ranking basis and evidence gaps. Missing contacts or activity are gaps, not negative customer signals.

Do not execute outreach or write CRM. Recommendations are planning-only and must trace to accessible CRM evidence.
