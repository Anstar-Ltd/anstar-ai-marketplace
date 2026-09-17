# Business Central preview verification

## Verified

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
| Approval and deployment of global callback settings | Pending decision; no employee config was changed |
| `Anstar AI Read Only` sandbox configuration | Active and usable; bounded write-action search empty; full administrator settings/permission audit still pending |
| BC MCP initialization and actual tools/list | Passed; Microsoft BC 28.0.54016.0 and 3 dispatchers |
| Microsoft sign-in and token renewal | Interactive sign-in and session reuse passed; restricted-normal-user pilot and refresh-token renewal pending |
| Bounded live MCP read | Passed for all 3 named entities, 1 row each |
| Negative identity access test | Not performed; never test by mutating records |
| Clean ChatGPT desktop Work pilot | Not performed |
| Windows pilot | Not performed |
| Hosted ChatGPT app / `.app.json` binding | Not implemented; no placeholder app ID |
| Employee marketplace release | Blocked: NOT_AVAILABLE and disabled |

The sandbox web UI was initially accessible using an existing browser session, but that does not authenticate the new plugin. The initial PnP read attempt failed for missing BC consent before data access; Entra app lookup failed for insufficient privileges. Browser use was subsequently moved to a fresh isolated profile on a dedicated debugging port, without copied login state. No Production endpoint or BC business-record mutation was used for verification.

Do not mark the requested upgrade/install/sign-in experience complete from these packaging checks. Keep the PR draft and finish [ADMIN-SETUP.md](ADMIN-SETUP.md) before activation.
