---
name: prepare-for-meeting
description: Prepare CRM-backed customer meeting briefs read-only.
---

# Prepare for Meeting

Use this read-only workflow when the user names a customer, prospect, account, attendee, meeting, or topic and wants preparation.

## Dependency categories

- `CRM` [Blocking for CRM-backed claims]
- `Calendar` [Non-blocking]
- `Email` [Non-blocking]
- `Meeting Transcripts` [Non-blocking]

Prefer `anstar-dataverse` for `CRM` and apply `crm-read-safety`. If CRM is unavailable, user-provided meeting context may support a clearly labelled partial brief. Do not block the first useful output for missing non-blocking sources.

1. Resolve the account unambiguously; present a bounded choice when several match.
2. Use supplied meeting details when Calendar is absent; do not claim to discover the next meeting.
3. Retrieve bounded account, relevant contact, opportunity, quote, and activity metadata evidence.
4. Produce: objective; CRM snapshot; recent activity; opportunity and stakeholder context; risks/gaps; questions; proposed agenda; desired close.
5. Label assumptions and blank fields explicitly.

Do not send invitations or follow-ups, create notes, or update CRM. Offer drafts only.
