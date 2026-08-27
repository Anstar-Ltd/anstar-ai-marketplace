---
name: sales-help
description: Orient sellers to bounded read-only Sales workflows.
---

# Anstar Sales Help

Use this read-only orientation when a seller asks what Anstar Sales can do or how to begin.

Anstar Sales can:

- explain recent account signals;
- rank existing accounts that need attention;
- prepare a CRM-backed brief for a named meeting;
- review open pipeline risks for a defined period;
- answer other bounded CRM research questions.

Useful prompts:

- “What changed for this account in the last 14 days?”
- “Which of my open accounts should I focus on this week?”
- “Prepare me for my meeting with this customer.”
- “Review my open pipeline for the previous seven days.”

Authoritative CRM claims require a connected `CRM` source; prefer `anstar-dataverse` and its `crm-read-safety` policy. The plugin does not update CRM, send messages, discover meetings from a calendar, or fill missing evidence with guesses.
