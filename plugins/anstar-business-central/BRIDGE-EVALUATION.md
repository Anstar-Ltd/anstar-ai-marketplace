# Local OAuth bridge evaluation

## Decision

The native HTTP sandbox pilot works, but Codex 0.146.0 requires global callback settings. The user selected investigation of a local npx bridge to avoid that per-device configuration. **No replacement bridge is adopted or shipped yet.** The existing native-HTTP plugin remains disabled for employee release.

`mcp-remote@0.14.2` is functionally promising but is **not recommended unchanged for employee deployment** after review of callback handling, optional debug logging, token storage and refresh coordination. Successful happy-path tests do not establish those security boundaries. A simple launcher would not fix all of the internal concerns.

## Candidate provenance

- Package: `mcp-remote@0.14.2`, MIT, community-maintained by `punkpeye`, originally by Glen Maddern. It is not a Microsoft product.
- Source: [release v0.14.2](https://github.com/punkpeye/mcp-remote/releases/tag/v0.14.2), commit `8ba22bdb4e73b818abf22b5e0c8fb5d96e90203b`, matching npm `gitHead`.
- Published tarball SHA-512 integrity was calculated and matched npm metadata. The tagged package source has an older version string; the published manifest and executable report 0.14.2, consistent with release-time versioning. This is not a reproducible-build comparison of every bundled dependency.
- Isolated production dependency audit: zero known vulnerabilities at evaluation time. Registry signatures verified for 81 packages; five package attestations verified. This audit does not prove the absence of unreported bugs or complete coverage of code bundled into the distribution.
- Historical [CVE-2025-6514](https://github.com/advisories/GHSA-6xpm-ggf7-wc3p) affected versions before 0.1.16; the selected version is outside that range.
- Tested Node.js: 22.23.2. The resolved Undici dependency requires Node >=20.18.1; having `npx` alone does not establish a compatible Node runtime.

## Exercised without company credentials

The actual published bridge ran against a synthetic loopback-only OAuth/MCP fixture, with external network access and automatic browser launch denied by the OS. No Microsoft authorization or BC request was made using this bridge.

| Check | Result |
| --- | --- |
| Public client, no secret, PKCE S256 | Passed; fake token endpoint verified the challenge |
| Explicit callback path | Passed; can match the already registered BC pilot callback |
| Tenant/environment/company/configuration-style headers | Passed, including spaces |
| First-login MCP initialize/list/call | Passed |
| Restart using cached login | Passed, no second login prompt |
| Expired fixture token refresh | Passed, one refresh exchange and no login prompt |
| New token-file POSIX mode | 0600 |
| Global Codex configuration | Not touched |

This demonstrates a route to a self-contained callback without global Codex settings, not live Microsoft compatibility. Windows and ChatGPT desktop execution were not tested.

## Remaining concerns

The independent bounded source review and targeted checks of the published artifact identified reasons not to adopt the stock bridge as-is:

- Callback validation/error handling needs hardening. A harmless loopback-only negative test confirmed the review concern; no script was executed and no real credentials were involved.
- Some debug paths can serialize credentials. Debug must remain off; host-captured stderr and authentication diagnostics need explicit redaction.
- Plaintext token files and verifiers need a dedicated, nonsynced owner-only directory. POSIX file modes do not isolate processes running as the same OS user, and Windows ACL behavior requires separate validation.
- Multi-process refresh locking has lease/lifecycle edge cases not covered by the successful single-process fixture. A rotating-token, concurrent-process test is required before claiming reliable refresh ownership.
- Generic discovery/transport code does not itself supply our intended Microsoft-origin, tenant, exact-tool and operation restrictions. A fixed endpoint and existing BC read-only configuration remain necessary.
- A top-level package pin does not freeze range-based transitive dependencies.

Detailed local security reproduction evidence is not included in this public marketplace. No upstream security-report publication or new live consent was performed as part of this evaluation.

## Proposed next path — not implemented

A small Anstar-owned local adapter using Microsoft's authentication library and the MCP SDK could own a fixed callback, bounded Microsoft-only requests, explicit read-only dispatch and isolated credential lifecycle. This avoids carrying a broad community bridge fork, but it is new maintained code and requires its own tests, provenance review and live pilot. It must not be called safer merely because Anstar owns it.

The current npm candidates inspected for that design are Microsoft `@azure/msal-node` (6.0.1, MIT, Node >=20) and `@modelcontextprotocol/sdk` (1.30.0, MIT, Node >=18). These versions have **not** been adopted or audited as an implementation dependency graph. Approval and implementation are separate from this investigation.
