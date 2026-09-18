# Changelog

## Unreleased

### Added

- Staged a Business Central read-only source plugin with search/describe/invoke discovery, administrator setup guidance and isolated Codex installation validation. Employee availability remains held while rollout acceptance is incomplete.

### Changed

- Added automatic first-use Microsoft sign-in links and pending-login reuse. Staged the explicitly requested Production / Anstar Ltd target in 0.3.0-preview.1; activation remains held until Production's dedicated read-only MCP configuration is confirmed and bounded reads pass. Existing sandbox setup is unchanged.

- Verified the replacement TypeScript adapter's personal Microsoft login, process-restart reuse and one-row sandbox reads of Items, Item Ledger Entries and Sales Orders. Hardened runtime-cache execution permissions, fixed a cache-lock release race, pinned the company and stopped in-flight connections during shutdown. Windows installation and desktop/restricted-user rollout remain separately gated.

- Replaced the native HTTP preview with an approved Anstar-owned TypeScript MSAL/MCP adapter launched by pinned npx tsx. Added automatic locked dependency setup, local sign-in/status tools, callback/state and cache protections, read-action enforcement and synthetic/runtime tests. Requires Node.js 22+ and npm/npx but no global Codex callback settings; new adapter live/desktop acceptance remains separate from the earlier successful native pilot.

- Added the administrator-supplied Business Central OAuth client ID after permission/consent setup was reported complete. The connection remains disabled until authenticated sandbox validation and the other release gates pass.
- Verified interactive Microsoft sign-in and isolated session reuse; identified the missing/inactive read-only BC MCP configuration as the next live-validation blocker.
- After sandbox configuration activation, verified discovery and one-row reads of Items, Item Ledger Entries and Sales Orders. Added precise discovery guidance and recorded remaining employee-rollout gates without publishing record values.
- Recorded the user's read-only configuration confirmation and evaluated a local OAuth bridge without company credentials. Kept adoption blocked on security/design review instead of substituting happy-path tests for a safe employee release.
