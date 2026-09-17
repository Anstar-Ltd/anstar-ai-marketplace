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

## Not verified / release blockers

| Gate | State |
| --- | --- |
| Dedicated Entra app/client ID and admin consent | Client ID supplied; administrator reports consent complete; interactive OAuth succeeded |
| Approval and deployment of global callback settings | Pending decision; no employee config was changed |
| `Anstar AI Read Only` sandbox configuration | Authenticated endpoint reports configuration not found or not active; create/activate and verify read-only settings |
| BC MCP initialization and actual tools/list | Attempted; blocked by HTTP 400 missing/inactive configuration; no tools discovered |
| Microsoft sign-in and token renewal | Interactive sign-in and session reuse passed; restricted-normal-user pilot and refresh-token renewal pending |
| Bounded live MCP read | Not performed |
| Negative identity access test | Not performed; never test by mutating records |
| Clean ChatGPT desktop Work pilot | Not performed |
| Windows pilot | Not performed |
| Hosted ChatGPT app / `.app.json` binding | Not implemented; no placeholder app ID |
| Employee marketplace release | Blocked: NOT_AVAILABLE and disabled |

The sandbox web UI was initially accessible using an existing browser session, but that does not authenticate the new plugin. The initial PnP read attempt failed for missing BC consent before data access; Entra app lookup failed for insufficient privileges. Browser use was subsequently moved to a fresh isolated profile on a dedicated debugging port, without copied login state. No Production endpoint or BC business-record mutation was used for verification.

Do not mark the requested upgrade/install/sign-in experience complete from these packaging checks. Keep the PR draft and finish [ADMIN-SETUP.md](ADMIN-SETUP.md) before activation.
