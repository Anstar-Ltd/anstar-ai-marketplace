---
name: prepare-for-meeting
description: Prepare CRM-backed Anstar meeting briefs read-only.
---

# Prepare for Meeting

Use this read-only workflow when the user names a customer, prospect, account, attendee, meeting, or topic and wants preparation. Compose `crm-read-safety` and use `anstar-dataverse` for CRM context.

1. Resolve the account unambiguously. If several accounts match, present a bounded candidate list and ask the user to choose.
2. The plugin has no calendar source: do not claim to discover the user's next meeting. Use the meeting details supplied by the user; ask only for the smallest missing anchor.
3. Retrieve bounded account, important contact, open opportunity, quote, and recent activity evidence that is relevant to the named meeting. Match the opportunity by topic, contacts, and recent activity rather than choosing any same-account opportunity.
4. Produce: meeting objective; CRM snapshot; recent activity; opportunity and stakeholder context; risks or gaps; questions to ask; proposed agenda; and a concrete desired close.
5. Cite returned links, names, dates, or record IDs. Label assumptions and blank fields explicitly.

Do not send invitations, messages, or follow-ups; create notes; or update CRM. Offer drafts for review only.
