---
name: analyze-account-signals
description: Explain recent Anstar account changes from read-only evidence.
---

# Analyze Account Signals

Use this read-only workflow when the user asks what changed for one account or a bounded owner/watchlist scope. Compose `crm-read-safety` and use `anstar-dataverse` as the authoritative CRM source.

1. Resolve one account by exact name or stable ID. For a portfolio request, require an owner or explicit account list and cap the first pass at 50 accounts.
2. Default the evidence window to the last 14 days unless the user specifies another period.
3. Use bounded, explicit-field queries for account truth, open opportunities, and recent accessible activities or modifications. Inspect schema before uncertain logical names, choices, or relationships.
4. Treat stage, amount, owner, dates, and statuses as CRM facts. Treat risk, opportunity, and urgency as interpretations tied to cited evidence.
5. Deduplicate records describing the same event. Do not imply a previous-run delta unless previous-run evidence exists.
6. Return: account snapshot; key recent signals; why they matter; recommended read-only next actions; open questions and missing evidence.

Do not use public news, enrichment, email, calendar, transcripts, or internal messaging in this MVP. Do not create monitoring state, tasks, posts, or CRM updates.
