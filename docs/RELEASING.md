# Release and update the Anstar AI marketplace

## Package-backed MCP plugins

Softeria Microsoft 365 and Plaud use exact npm versions in their `.mcp.json` files. Renovate monitors those pins and opens a reviewable pull request when a new release is available. It must not auto-merge an MCP update.

For each proposed package update:

1. Read the vendor release notes and permission changes.
2. Update the exact package pin.
3. Update the plugin manifest version, preserving the upstream version and adding a Codex cachebuster when needed.
4. For Softeria, confirm `--org-mode` remains present and no application credential has been added.
5. Run the validator and full test suite.
6. Test authentication and one bounded read using a non-administrator employee account.
7. Merge only after review, then tell employees to refresh the marketplace and restart the app.

Commands:

```text
python scripts/validate_plugins.py
python -m unittest discover -s tests -p "test_*.py" -v
codex plugin marketplace upgrade anstar-ai
```

## Hosted MCP plugins

ClickUp and GitHub update their hosted services independently. ClickUp also depends on its official Codex app binding in `.app.json`. Changes to an endpoint URL, app identifier, OAuth behaviour, tool surface or authorization boundary still require a reviewed marketplace release and an employee-account smoke test.

## Microsoft 365 access invariant

The normal employee Softeria plugin must use delegated interactive authentication. Do not add a client secret, application-only token, shared service identity or administrator credential. Organisation mode may expose Teams and SharePoint tools, but Microsoft Graph must continue to evaluate every request against the signed-in employee's own permissions.

## Rollback

Revert the marketplace commit to the last validated configuration, push the rollback, refresh the configured marketplace and restart Codex. Do not work around a failed rollout by sharing credentials or widening tenant permissions.
