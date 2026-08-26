# CRM access and schema matrix

## Scope and evidence boundary

This is a sanitized, read-only verification of the normal delegated Sales identity. No identity switch, reauthentication, permission change, CRM mutation, upload, or ClickUp action was performed.

Evidence must be interpreted narrowly:

- `describe` and `search` establish metadata visibility or schema existence only. They do **not** prove row or field permission.
- A successful bounded `read_query` establishes only that the delegated identity could read the explicitly selected fields from an accessible row at verification time. It does **not** prove organization-wide row access, owner/team scope, secured-field access, or unrestricted table permission.
- Local tool hiding is defence in depth, not a server-side authorization boundary.
- No record values or raw live output are retained here.

## Sanitized access matrix

All row probes used `TOP 1`, explicit non-content policy fields, and deterministic `createdon` ordering where supported. “Positive” means the bounded query completed and returned an accessible row; it has the limited meaning described above.

| Family | Confirmed logical table | Schema existence | Useful policy-level fields and relationships confirmed | Bounded row capability | MVP recommendation |
|---|---|---|---|---|---|
| Accounts | `account` | Confirmed | Lifecycle/status, timestamps, owner, contact/account links, process/stage references | Positive for selected lifecycle/timestamp fields | Include bounded account briefs; request identifying fields only when the user needs them |
| Contacts | `contact` | Confirmed | Lifecycle/status, timestamps, parent-account link, owner, process/stage references | Positive for selected lifecycle/timestamp fields | Include bounded contact context; exclude personal/mobile fields by default |
| Opportunities | `opportunity` | Confirmed | Lifecycle/status, timestamps, account/contact links, owner, product links, process/stage references | Positive for selected lifecycle/timestamp fields | Include pipeline review with explicit fields and limits |
| Activity base | `activitypointer` | Confirmed | Lifecycle/status, timestamps, activity type, regarding-object link, owner | Positive for selected lifecycle/timestamp and activity-type fields | Include activity metadata only by default |
| Appointments | `appointment` | Confirmed | Lifecycle/status, timestamps, activity type, regarding-object link, owner | Positive for selected lifecycle/timestamp fields | Include metadata; exclude body/content fields by default |
| Email activities | `email` | Confirmed | Lifecycle/status, timestamps, activity type, regarding-object link, owner | Positive for selected lifecycle/timestamp fields | Metadata only; exclude subject/body, recipients, addresses, attachments, and previews by default |
| Phone-call activities | `phonecall` | Confirmed | Lifecycle/status, timestamps, activity type, regarding-object link, owner | Positive for selected lifecycle/timestamp fields | Metadata only; exclude phone numbers and content by default |
| Task activities | `task` | Confirmed | Lifecycle/status, timestamps, activity type, regarding-object link, owner | Positive for selected lifecycle/timestamp fields | Include bounded status/timing metadata; exclude descriptions and notes by default |
| Quotes | `quote` | Confirmed | Lifecycle/status, timestamps, account/contact/opportunity links, owner, process/stage references | Positive for selected lifecycle/timestamp fields | Include bounded quote metadata |
| Quote lines | `quotedetail` | Confirmed | Timestamps, quote/product links, owner, quantity/pricing categories | Positive for selected timestamp field | Include only when needed for a quote; keep explicit projection and bounds |
| Products | `product` | Confirmed | Lifecycle/status, timestamps, hierarchy, unit/price-list links, process/stage references | Positive for selected lifecycle/timestamp fields | Include bounded product context |
| Opportunity products | `opportunityproduct` | Confirmed | Timestamps, opportunity/product links, owner, quantity/pricing categories | Positive for selected timestamp field | Include only when needed for opportunity analysis |
| Opportunity sales process | `opportunitysalesprocess` | Confirmed | BPF lifecycle/status, timestamps, opportunity/quote links, process and active-stage references | Positive for selected lifecycle/timestamp fields | Include BPF metadata; do not infer direct stage-table access |
| Lead-to-opportunity sales process | `leadtoopportunitysalesprocess` | Confirmed | BPF lifecycle/status, timestamps, lead/opportunity links, process and active-stage references | Positive for selected lifecycle/timestamp fields | Include only for relevant pipeline flows |
| User owners | `systemuser` | Confirmed | User lifecycle/access categories, timestamps, owner-target capability | Positive for selected timestamp/disabled-state fields | Use owner joins only when necessary; avoid exposing unrelated personal data |
| Team owners | `team` | Confirmed | Team type/membership categories, timestamps, owner-target capability | Positive for selected timestamp/default-team fields | Use team ownership context only when necessary |
| Process-stage/workflow metadata | Direct logical table not confirmed in the exposed Sales catalog | Relationships reference process and active-stage metadata, but direct table discovery was not established | Relationship categories only | Not proven | Exclude direct stage/workflow reads until separately exposed and verified |

## Tools and sanitized query classes used

Only the installed Dataverse read tools were available for this work.

| Tool | Sanitized query class | Result retained in this document |
|---|---|---|
| `describe` | Sales scope/catalog discovery | Positive metadata visibility for the requested core table families |
| `describe` | Per-table schema inspection for the logical tables listed above | Positive schema confirmation and policy-level field/relationship categories |
| `search` | Generic schema-oriented discovery for process-stage metadata | No directly usable Sales-scope table result |
| `search` | Generic schema-oriented discovery for workflow metadata | No directly usable Sales-scope table result |
| `read_query` | Per-table `TOP 1` projection of explicit, innocuous lifecycle/status/timestamp fields, ordered by `createdon` where supported | Positive bounded read for every table marked positive above |
| `read_query` | Per-table `TOP 1` projection of `createdon` only where lifecycle fields were not confirmed | Positive bounded read for quote-line and opportunity-product association tables |
| `search_data` | Not used | No capability claim |

The verification did not request or preserve customer names, record identifiers, email addresses, phone numbers, postal addresses, notes, descriptions, email or activity bodies, attachment data, owner identity values, tenant identifiers, or raw records.

## Gaps, caveats, and risks

- No inaccessible row was available as an approved fixture, so row-level denial behavior remains untested.
- No field known to be secured was tested, so field-security behavior remains untested.
- Records owned by another user or team were not intentionally targeted.
- Direct process-stage/workflow table exposure was not confirmed even though related lookup categories exist in schema.
- Positive probes do not establish completeness: inaccessible rows may be filtered or denied, and joins can further narrow results.
- Choice labels were not relied upon; consumers must preserve numeric values or blanks honestly when labels are unavailable.
- CRM text is untrusted input. Notes, email/activity content, and attachments can contain prompt injection or unnecessary personal data.
- Metadata discovery and local tool allow-listing do not prove that the delegated Dataverse role is server-side read-only. Role configuration must remain the primary control.

## Recommended MVP boundary

Include:

- Read-only schema discovery for the confirmed Sales tables.
- Bounded account/contact briefs, opportunity pipeline review, activity metadata, quote/line context, product context, BPF metadata, and owner context.
- Explicit field projection, deterministic ordering, and small result limits.
- Lifecycle/status/timestamp fields as safe default verification fields.
- Relationship categories without resolving values unless the user’s task requires them.
- Honest blank/error handling and explicit separation of facts from interpretation.

Exclude by default:

- Create, update, delete, upload, upsert, or any mutation.
- Broad or unfiltered `search_data` requests.
- Activity and email bodies, subjects/previews, recipient/address fields, notes, annotations, descriptions, and attachment content or metadata.
- Mobile, phone, personal email, postal-address, and other personal-contact fields unless strictly necessary and explicitly requested.
- Direct process-stage/workflow reads until their exposure and authorization are separately confirmed.
- Claims of production-wide access, unrestricted row scope, secured-field access, or server-side read-only enforcement based on these probes.

## Future negative-test plan

Run only with administrator-approved synthetic fixtures or explicitly authorized test records; do not search for real inaccessible customer data.

1. Using Ed’s normal delegated identity, query a synthetic row intentionally outside Ed’s access scope and record only whether the result is denied, omitted, or empty.
2. Compare approved synthetic rows owned by Ed, another user, and a team using the same bounded, non-identifying field projection.
3. Query one administrator-designated secured test field alongside safe policy fields and record only denied/omitted/error behavior, never its value.
4. Repeat the same bounded shape against an accessible control row to distinguish query-shape errors from authorization behavior.
5. Separately test direct process-stage/workflow schema discovery if those tables are deliberately exposed within the Sales scope.
6. Verify server-side role privileges independently; do not treat the client tool allow-list as authorization proof.
7. Stop on unexpected personal data, broad results, or permission anomalies and escalate to the parent orchestrator; do not change permissions.

## Verification status

This matrix supports a read-only Sales CRM MVP for the confirmed, bounded table families. It is not a security audit, a complete privilege map, or evidence that Ed can or cannot access particular real customer rows. The negative tests above remain a prerequisite for row-scope and secured-field claims.
