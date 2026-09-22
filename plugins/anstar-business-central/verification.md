# Business Central preview verification

## Production transition / first-use authentication — 0.3.0-preview.1

- User reported the ChatGPT local sandbox connection works. This is user-reported desktop evidence, not an independently observed desktop trace.
- User explicitly selected exact environment `Production`, company `Anstar Ltd`, and approved discovery plus one selected-field row each from Items, Item Ledger Entries and Sales Orders, with no writes. This supersedes the previous sandbox-only verification restriction for those bounded reads only.
- Packaged configuration and validation pin Production. The user created Production's `Anstar AI Read Only` configuration; personal sign-in, process-restart reuse, discovery, and the three bounded reads passed. Distribution is now AVAILABLE/enabled. Sandbox configuration and the earlier local sandbox test copy are unchanged.
- First relevant message is handled by the bundled skill; unauthenticated business-tool calls now initiate sign-in and return a link before any business call. Startup/tools-list/status stay passive. Repeated sign-in requests reuse the pending link and remaining lifetime.
- New behavior has synthetic regression coverage and Production live evidence. A fresh Production credential namespace and sign-in were used; no sandbox tokens were copied.

## Current TypeScript adapter — separate acceptance

The user approved replacing native HTTP with an Anstar-owned MSAL/MCP adapter launched via pinned npx tsx. The former native pilot below is historical, not evidence of this adapter's live sign-in.

- Local macOS tests pass for callback state/error validation, real MSAL with synthetic authorization-code/cache/refresh responses, cross-process cache transactions, fixed Microsoft destinations, bounded streams, read-action policy, MCP discovery and the actual stdio entrypoint.
- A fresh home/empty npm cache/plugin copy without node_modules launched the exact `npx -y tsx@4.23.13 ./scripts/bootstrap.ts` command. First run installed the locked production dependency tree; second run reused it. Both returned five expected tools and unauthenticated status. No OAuth or BC call was made, and no global Codex settings were used.
- Real Codex 0.146.0 offline install/readback now verifies the stdio command, args, plugin-relative cwd, five-tool allowlist and timeouts. The release hold and disabled transport remain in place.
- A separate disposable local marketplace enabled only the pilot copy, with a fresh Codex home and npm cache. Real Codex app-server started the exact npx adapter and returned all five tools without global callback settings, OAuth initiation or BC calls. This verifies host startup, not live authentication.
- **New adapter live Microsoft sign-in and restart reuse passed** through the isolated Codex app-server with no global callback settings. The initial discovery call failed without a detailed error; an instrumented bounded retry returned HTTP 200 and it did not recur. No transport/policy relaxation was needed.
- **New adapter search → describe → invoke passed** for Items, Item Ledger Entries and Sales Orders, one row each with the same four selected fields listed below. Field sets and counts were checked locally; no row values are published. The pilot's initial parser incorrectly assumed a single JSON text block; it was corrected to handle the separate summary and JSON data blocks without changing the adapter.
- Microsoft login and all reads ran against the fresh installed `0.2.0-preview.1` adapter snapshot from commit `ea9a7ca`. Later changes only classify Windows errors and adjust Windows first-install deadlines, not the verified macOS auth/read path. The pilot's cached server was disabled afterward.
- Local adapter suite: 41 discovered, 30 passed and 11 Windows-only skipped on macOS; Windows CI passed 39 with 2 POSIX-only skips. All 26 Python tests and typecheck pass. **All five CI jobs passed at code commit `3da1255`**, including macOS/Linux/Windows fresh npx installation and cache reuse, offline Codex smoke, and repository/secret validation ([run](https://github.com/Anstar-Ltd/anstar-ai-marketplace/actions/runs/35296986044)). Windows's initial dependency-tree ACL timeout was resolved with runtime-specific bounded deadlines, without relaxing permission checks.
- Bounded review found a runtime-cache permission gap, reproduced with a failing regression and fixed by validating private roots/executable descendants. The targeted recheck confirmed the original payload is blocked and identified a Windows volume-root edge case; the shared ancestor check now includes the root, with a source contract avoiding changes to real volume permissions. No further broad review cycle is planned.

## Historical native HTTP pilot

- Existing marketplace baseline: 20 MVP contracts and 4 employee-rollout tests passed before changes.
- Codex CLI **0.146.0** was exercised through a fresh local marketplace, isolated HOME/CODEX_HOME/XDG paths and file-only credential storage. `sandbox-exec` denied all network access and access to the normal Codex/agent homes.
- The actual repository marketplace refused installation with its `NOT_AVAILABLE` policy; plugin-list readback confirmed it was not installed.
- A disposable marketplace copy changed **installation policy only** to AVAILABLE. Native `plugin add` succeeded; installed files matched source byte-for-byte and `plugin list` confirmed installation.
- `codex mcp get anstar-business-central --json` preserved the Microsoft endpoint, all four target headers, the three dispatcher names and timeouts. The server remained disabled.
- The smoke ran 10 commands: 9 successful, 1 expected release-policy refusal. It created no OAuth credential files and made no BC read or write calls. Reproduce with `python3 scripts/smoke_business_central.py` on macOS.
- The first-party protected-resource metadata endpoint responded without credentials and advertised tenant Entra OAuth with `https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All`. This establishes public auth discovery only, not authenticated MCP transport.
- Codex release-tag source confirms `oauth.client_id`, `http_headers` and URL-specific callback suffix handling. This runtime ignores plugin-specific callback settings. `mcp get` does not serialize OAuth/scopes; its output is not claimed as verification of those omitted fields.
- With the administrator-supplied client ID, an isolated native Codex app-server OAuth request produced a Microsoft authorization URL containing that exact ID, PKCE S256, the documented scopes, and `http://localhost:33418/callback/GNmTSc-BOPT4`. No browser was opened automatically. This confirms the runtime uses the packaged client ID and pilot callback settings; it does not yet prove that Microsoft accepts the registration or that sign-in succeeds.
- The subsequent interactive sign-in completed with Codex reporting `success: true`. A fresh app-server process reused the isolated OAuth session and reported `authStatus: oAuth`. Authenticated MCP discovery then returned HTTP 400: **The MCP Configuration named Anstar AI Read Only was not found or not active.** No business tools were invoked. This verifies login and session reuse, not refresh-token renewal, successful MCP initialization or read access.

## Authenticated sandbox reads — passed

After the administrator activated the configuration, the same isolated login successfully initialized Microsoft's BC MCP **28.0.54016.0** in `sandbox-uat-2026-march` / `Anstar Ltd`. Exactly the three configured dispatchers were discovered. Search and describe identified the following list actions, each invoked with `top: 1`, explicit `select`, and `resultFormat: text`:

| Entity | Discovered action | Selected fields | Result |
| --- | --- | --- | --- |
| Items | `List_Items_PAG30008` | id, number, type, blocked | 1 row; no error |
| Item Ledger Entries | `List_ItemLedgerEntries_PAG30069` | id, entryNumber, postingDate, entryType | 1 row; no error |
| Sales Orders | `List_SalesOrders_PAG30028` | id, number, orderDate, status | 1 row; no error |

Response rows were checked locally: each contained only the selected fields plus `@odata.etag`. No record values are published. No create/modify/delete/bound action was invoked, and no Production environment was accessed.

A discovery-only search for `item,sales,customer` with action types Create, Modify, Delete and BoundAction returned no matches. This is a bounded surface check, **not** a full permission audit or identity-denial test. The generic invoke tool still advertises `readOnlyHint: false` / `destructiveHint: true`; action-level List discovery and the server-side configuration determine the operation, not those generic dispatcher hints. Entity descriptions may mention CRUD even for the selected List action.

Observed quirks: the first broad search timed out at 120 seconds; a bounded retry succeeded. Blank SearchText returned a tool error and therefore provides no evidence of an empty write surface. Use non-empty exact action fragments (for example `List_Items`) and do not treat a Top-limited result list as exhaustive. Live discovery included API-query and nested list actions beyond the older documentation's API-page-only description; support outside the three validated entities remains unverified.

## Not verified / release blockers

| Gate | State |
| --- | --- |
| Dedicated Entra app/client ID and admin consent | Client ID supplied; administrator reports consent complete; interactive OAuth succeeded |
| Employee callback delivery | Adapter callback and live personal sign-in passed in isolated Codex without global settings |
| `Anstar AI Read Only` sandbox configuration | Active and usable; user confirmed every edit/bound-action permission OFF; bounded write-action search empty; restricted-user boundary test still pending |
| BC MCP initialization and actual tools/list | Current adapter passed; three remote business dispatchers plus two local connection tools |
| Microsoft sign-in and token renewal | Current adapter interactive sign-in and process-restart reuse passed; expired-token renewal verified synthetically, not by a live expiry soak |
| Bounded live MCP read | Current adapter passed all 3 named entities, 1 row each with limited fields |
| Negative identity access test | Not performed; never test by mutating records |
| Clean ChatGPT desktop Work pilot | User reports the local connection works; independently observed Codex/stdio verification is complete |
| Windows pilot | Real CI auth/cache tests and full clean dependency-install/reuse pass; live Windows user sign-in not performed |
| Hosted ChatGPT app / `.app.json` binding | Not implemented; no placeholder app ID |
| Employee marketplace release | AVAILABLE and enabled; PR merge/marketplace upgrade remains the publication step |

The sandbox web UI was initially accessible using an existing browser session, but that does not authenticate the new plugin. The initial PnP read attempt failed for missing BC consent before data access; Entra app lookup failed for insufficient privileges. Browser use was subsequently moved to a fresh isolated profile on a dedicated debugging port, without copied login state. No Production endpoint or BC business-record mutation was used for verification.

The upgrade/install/sign-in path is implemented and Production reads are verified. PR merge remains the publication step; the restricted-user identity boundary and live Windows sign-in are documented follow-up checks, not blockers to the read-only adapter's local policy and Production MCP configuration.
