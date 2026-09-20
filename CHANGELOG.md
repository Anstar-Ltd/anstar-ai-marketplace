# Changelog

## Unreleased

### Added

- Added the installable Business Central Production read-only plugin with first-use Microsoft sign-in, search/describe/invoke discovery, administrator guidance and cross-platform installation validation.

### Changed

- Added automatic first-use Microsoft sign-in links and pending-login reuse. Switched the explicitly requested target to Production / Anstar Ltd in 0.3.0-preview.1 after its dedicated read-only MCP configuration and bounded reads were verified. Existing sandbox setup is unchanged.
- Verified the Production configuration through a fresh personal sign-in, process restart and one-row reads of Items, Item Ledger Entries and Sales Orders; enabled marketplace installation and runtime startup. No writes were attempted.

- Verified the replacement TypeScript adapter's personal Microsoft login, process-restart reuse and one-row sandbox reads of Items, Item Ledger Entries and Sales Orders. Hardened runtime-cache execution permissions, fixed a cache-lock release race, pinned the company and stopped in-flight connections during shutdown. Windows installation and desktop/restricted-user rollout remain separately gated.

- Replaced the native HTTP preview with an approved Anstar-owned TypeScript MSAL/MCP adapter launched by pinned npx tsx. Added automatic locked dependency setup, local sign-in/status tools, callback/state and cache protections, read-action enforcement and synthetic/runtime tests. Requires Node.js 22+ and npm/npx but no global Codex callback settings; new adapter live/desktop acceptance remains separate from the earlier successful native pilot.

- Added the administrator-supplied Business Central OAuth client ID after permission/consent setup was reported complete. The connection remains disabled until authenticated sandbox validation and the other release gates pass.
- Verified interactive Microsoft sign-in and isolated session reuse; identified the missing/inactive read-only BC MCP configuration as the next live-validation blocker.
- After sandbox configuration activation, verified discovery and one-row reads of Items, Item Ledger Entries and Sales Orders. Added precise discovery guidance and recorded remaining employee-rollout gates without publishing record values.
- Recorded the user's read-only configuration confirmation and evaluated a local OAuth bridge without company credentials. Kept adoption blocked on security/design review instead of substituting happy-path tests for a safe employee release.
