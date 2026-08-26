# ADR: bounded n8n and MCP architecture for Anstar Sales

- **Status:** Proposed for MVP
- **Date:** 2026-08-26
- **Scope:** one read-only CRM automation and a narrow ChatGPT invocation surface

## Context

Anstar already runs n8n on the shared `anw1` VPS and has a read-only Sales CRM plugin backed by Dataverse. The next step must add useful automation without turning n8n into a general agent platform, exposing its administration surface to ChatGPT, or treating client-side tool hiding as authorization.

Official n8n documentation distinguishes three roles. Its MCP Client node calls tools from an external MCP server.[3] Its MCP Server Trigger exposes tools attached to one workflow.[4] Instance-level MCP can search, execute, create, and edit workflows, with all connected clients seeing the same MCP-enabled workflow set subject to user permissions.[5]

OpenAI developer mode supports remote MCP tools, including write tools, and explicitly warns about prompt injection, model mistakes, and malicious MCPs.[2] OpenAI expects an authenticated MCP server carrying customer-specific data to use OAuth 2.1 and validate access tokens on every request.[1]

## Decision

### 1. Use direct Dataverse access for deterministic n8n automations

The scheduled weekly digest will call the Dataverse Web API directly with an n8n credential belonging to a dedicated Dataverse application user. Direct access is preferred when the workflow owns a fixed query, schema, schedule, pagination, and retry policy. It is simpler to observe and test than inserting MCP into a non-agentic data path.

Use n8n as an **MCP client** only when a workflow genuinely needs an existing governed MCP capability—for example, a shared read-policy façade that normalizes safe tools across multiple callers—or when an AI Agent must select among MCP tools. The regular MCP Client node is preferred for deterministic calls; n8n documents the separate MCP Client Tool for agent-selected calls.[3] Do not use MCP merely as a wrapper around one known HTTP query.

### 2. Expose one purpose-built workflow endpoint to ChatGPT, not instance-level n8n MCP

ChatGPT may call selected workflows only through a dedicated MCP Server Trigger workflow whose public tool surface is intentionally authored for the business operation, initially:

- `get_weekly_sales_focus_digest(period_end?, refresh=false)`

Do **not** connect ChatGPT to n8n's instance-level MCP for this MVP. That interface includes workflow discovery/build/edit capabilities, cannot restrict different enabled workflows to different MCP clients, and is therefore wider than the required runtime contract.[5] The per-workflow MCP Server Trigger exposes only attached tools and supports streamable HTTP, which is the narrower boundary.[4]

The ChatGPT tool returns an existing successful digest by default. `refresh=true` may start a new read-only run only for an authorized user and remains subject to the same idempotency key and rate limit. No generic “run workflow,” arbitrary query, workflow editing, credential management, or n8n administration tool is exposed.

### 3. Run the CRM façade as a separate service/security boundary beside n8n

**Yes**, a future Anstar read-only CRM façade should be a separate, version-pinned container/Compose service on `anw1`, not code embedded in the n8n container. It should have:

- its own least-privilege identity and credential material;
- an explicit read-only tool allow-list and server-side query constraints;
- independent logs, health check, deployment lifecycle, resource limits, and network policy;
- no n8n database, Docker socket, filesystem, or administration access.

Only the façade joins the reverse-proxy network when ChatGPT needs it. n8n reaches it over a private Compose network. Dataverse permissions remain the real authorization boundary; MCP tool hiding is defense in depth. Microsoft's official Dataverse MCP can connect other MCP clients, but its effective data access still derives from the authenticated identity's Dataverse permissions.[12]

The façade is **not required to ship the first scheduled digest**: that workflow uses direct Dataverse Web API access. Build the façade before exposing broad conversational CRM access or reusing a common governed tool surface across ChatGPT and n8n.

### 4. Separate interactive and automation identities

- **Interactive ChatGPT CRM access:** delegated OAuth identity, so Dataverse applies the signed-in person's roles and row/field access. The MCP resource validates each access token. Do not share a bearer token or automation identity among users.[1]
- **Scheduled n8n automation:** dedicated Entra service principal represented by a Dataverse application user with a bespoke read-only security role limited to the digest's tables/columns. Dataverse documents application users for server-to-server access and requires the service to control access to the data available to that identity.[11]
- **MCP-triggered digest retrieval:** ChatGPT authenticates to the narrow workflow endpoint as a person; the workflow's CRM read still runs under the dedicated automation identity. The returned aggregate must never exceed the caller population approved for the digest. If per-user filtering becomes required, use delegated CRM access through the façade instead of impersonation.

Never use Mohamed's delegated refresh token for unattended schedules, and never give an interactive ChatGPT app the automation credential.

## Network and operational controls

### Public HTTPS, DNS, and TLS

- Publish only a dedicated hostname such as `sales-tools.<approved-domain>` through the existing Nginx Proxy Manager on ports 443/80; do not publish n8n/container ports directly.
- Route only the narrow MCP path to the MCP workflow/façade. Keep the n8n editor, REST API, metrics, and administration paths behind their existing access controls and off this hostname.
- Require valid public TLS, force HTTPS after verification, and allow only streamable HTTP. If MCP Server Trigger is used behind nginx, disable proxy buffering for `/mcp*`; n8n warns that buffering and multi-replica routing can break SSE/streamable HTTP connections.[4]
- Do not enable HSTS until DNS, certificate renewal, and recovery are proven. DNS, hostname, and certificate issuance require Mohamed's approval.

### Secrets and credentials

- Store Dataverse and destination credentials in n8n's credential store, not workflow JSON, Git, URLs, logs, or ChatGPT prompts. Set and back up a stable `N8N_ENCRYPTION_KEY`; n8n uses it to protect credential encryption keys.[7]
- Keep deployment secret files outside Git with restrictive filesystem permissions. Use an external secret store only if the licensed n8n feature and operational ownership justify it; it is not an MVP prerequisite.
- Give the façade separate mounted/file-injected secrets and rotate it independently. No secrets are copied between containers or returned in tool errors.

### Audit and privacy

- Assign a correlation ID to every schedule or MCP call and record: workflow version, caller subject or scheduler identity, period, idempotency key, row counts, status, timings, destination, and error class.
- Do not log tokens, query payload values, CRM rows, email/body text, contact details, notes, or attachments. Store the minimum aggregate needed to reproduce the digest.
- Save failed execution metadata; redact execution input/output where it may contain CRM data. Set explicit retention and pruning—n8n notes that execution pruning removes finished execution data and binary data.[10]
- Review access logs, n8n executions, Entra sign-ins, and Dataverse audit evidence as separate layers. A successful MCP HTTP response is not proof that the CRM read or delivery succeeded.

### Idempotency, retries, limits, approvals, and recovery

- Canonical idempotency key: `weekly-sales-focus:v1:<period-start-UTC>:<period-end-UTC>`. Enforce a unique durable record before CRM retrieval. A duplicate returns the existing successful artifact; a failed record may be resumed only through the recovery path.
- Retry only transient `429`, `408`, and `5xx` failures, honoring `Retry-After`, with bounded exponential backoff and jitter (maximum three attempts). Never retry authentication/authorization failures or malformed queries. n8n recommends retry delays or batching to remain within API rate limits.[8]
- Cap each run by fixed page size, maximum pages/records, execution timeout, and one active execution per idempotency key. Rate-limit MCP refresh to one accepted refresh per period per authorized caller.
- Configure an n8n error workflow; n8n supports a designated error workflow for failed executions.[9] It emits a sanitized alert with correlation ID and recovery state, not CRM content.
- The scheduled read and delivery to one pre-approved private destination need no per-run approval. Changing recipient/channel, widening fields/tables, enabling a new ChatGPT tool, `refresh=true` after a successful run, or any CRM/ClickUp write requires Mohamed's explicit approval and a new reviewed workflow version.
- Recovery is operator-driven: classify the failure, correct credentials/query/destination, then resume the same idempotency record. Never delete the failed record or create a second period key to bypass dedupe. Roll back by unpublishing the MCP workflow and restoring the prior named n8n workflow version; the scheduled digest can remain independently disabled.

## Read-only MVP: Weekly Sales focus digest

### Purpose and inputs

Every Monday at an agreed UK time, summarize the prior/current sales focus from bounded CRM reads:

- reporting period (default: previous Monday 00:00 through Sunday 23:59:59, Europe/London, normalized to UTC in queries);
- active opportunities and permitted account/owner/stage/value/expected-close fields;
- permitted recent activity metadata needed to identify stale or upcoming follow-up;
- configurable thresholds for stale activity and near-term close;
- fixed maximum record/page limits and the workflow version.

Exclude free-text email/activity bodies, notes, attachments, personal mobile fields, and any table/column not explicitly included in the application user's role and reviewed query contract.

### Processing and output

Use fixed OData/Web API queries, normalize records, and generate a compact digest:

1. top opportunities needing attention, with evidence fields and reason codes;
2. overdue or missing next-action signals;
3. near-term closes and obvious data gaps;
4. a coverage footer with period, last successful read, record counts, exclusions, and incomplete-data warnings.

Output destination options, in preference order:

1. **MVP default:** one private email to a pre-approved Anstar recipient or distribution list;
2. a private Teams chat/channel already approved for Sales operations;
3. retrieval through the narrow ChatGPT MCP tool without proactive delivery.

Choose exactly one proactive destination for commissioning. No ClickUp task creation, CRM write-back, broad channel posting, or multiple-destination fan-out.

### Identity, schedule, dedupe, and failure behavior

- Identity: dedicated read-only Dataverse application user; separate least-privilege credential for the selected destination.
- Schedule: Monday at an agreed Europe/London time, with timezone-aware DST handling. Manual commissioning runs use an explicit historical period and the same dedupe rules.
- Dedupe: use the canonical period key above; record content hash and destination message identifier after confirmed delivery.
- Failure: no partial digest is sent. Mark the run failed, send one sanitized operational alert, and permit bounded operator resume. If source coverage exceeds limits or required fields are unavailable, fail closed rather than presenting a confident partial ranking.

### Acceptance criteria

The MVP is accepted only when all are demonstrated with non-sensitive test fixtures and one authorized bounded live run:

- the automation identity can read every required field and cannot create/update/delete CRM records;
- the same period triggered twice produces one digest and one delivery;
- transient failure retries are bounded, while auth/schema failures fail immediately and alert once;
- digest items trace to permitted evidence fields and blanks remain explicit;
- excluded bodies, notes, attachments, and personal fields do not appear in queries, execution data, logs, or output;
- recipient/channel, timezone/DST behavior, record caps, runtime, TLS, and restore/unpublish procedure are verified;
- if ChatGPT retrieval is enabled, it discovers only the named digest tool and cannot access n8n workflow editing, credentials, arbitrary execution, or generic CRM querying.

### Explicit non-goals

No autonomous CRM or ClickUp writes; no giant shared agent platform; no general-purpose natural-language-to-OData; no arbitrary n8n administration through MCP; no per-user impersonation by the scheduler; no activity/email body, notes, attachment, or mobile ingestion; no forecasting model; no automatic task assignment; no multi-channel broadcasting; and no HA/queue-mode redesign for this single weekly workflow.

## Consequences

This design duplicates a small amount of policy between the direct weekly query and the later façade, but preserves a clear operational path and avoids forcing MCP into deterministic automation. It also keeps ChatGPT's public attack surface narrow and makes the eventual façade independently reviewable and revocable. The trade-off is that Mohamed must approve the hostname, delivery destination, schedule, and automation identity/security role before implementation.

## Sources

[1] https://developers.openai.com/plugins/build/auth — Authentication patterns for plugin MCP servers
[2] https://developers.openai.com/api/docs/guides/developer-mode — ChatGPT developer mode
[3] https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcpclient — MCP Client node
[4] https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger — MCP Server Trigger node
[5] https://docs.n8n.io/connect/connect-to-n8n-mcp-server — Connect to n8n MCP server
[7] https://docs.n8n.io/hosting/securing/encryption-key-rotation — n8n encryption key rotation
[8] https://docs.n8n.io/integrations/builtin/handle-rate-limits — Handle rate limits in n8n
[9] https://docs.n8n.io/build/flow-logic/handle-errors-gracefully — Handle errors gracefully in n8n
[10] https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/manage-execution-data — Manage execution data in n8n
[11] https://learn.microsoft.com/en-us/power-apps/developer/data-platform/build-web-applications-server-server-s2s-authentication — Dataverse server-to-server authentication
[12] https://learn.microsoft.com/en-us/power-apps/maker/data-platform/data-platform-mcp-other-clients — Use Dataverse MCP with other clients
