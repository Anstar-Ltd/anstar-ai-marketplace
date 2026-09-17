# Changelog

## Unreleased

### Added

- Staged a first-party Business Central read-only source plugin with search/describe/invoke discovery, no additional runtime CLI, administrator setup guidance and isolated Codex installation validation. Employee availability remains blocked pending Entra registration, callback deployment approval, read-only sandbox configuration and authenticated pilot checks.

### Changed

- Added the administrator-supplied Business Central OAuth client ID after permission/consent setup was reported complete. The connection remains disabled until authenticated sandbox validation and the other release gates pass.
- Verified interactive Microsoft sign-in and isolated session reuse; identified the missing/inactive read-only BC MCP configuration as the next live-validation blocker.
- After sandbox configuration activation, verified discovery and one-row reads of Items, Item Ledger Entries and Sales Orders. Added precise discovery guidance and recorded remaining employee-rollout gates without publishing record values.
