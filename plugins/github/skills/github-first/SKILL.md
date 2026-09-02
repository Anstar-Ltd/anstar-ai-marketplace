---
name: github-first
description: Use GitHub's official MCP connection before a browser or GitHub CLI for repository, branch, file, issue, pull request, release or workflow work. Apply when a user asks Codex to inspect or change GitHub, including creating a pull request or editing repository content.
---

# Use GitHub MCP first

Use the GitHub MCP tools before opening a browser or using GitHub CLI for GitHub work.

## Confirm the connection

1. Call `mcp__github__get_me` before repository work to confirm the signed-in identity and connection.
2. Treat the live `mcp__github__*` tool schema as the source of truth for available operations.
3. If the required tool is missing, report whether the plugin is unavailable, unauthenticated, still exposing the read-only endpoint or lacks the required capability. Explain this before suggesting a browser or CLI fallback.

## Read and write safely

- Repository reads do not authorise a write. Make remote changes only when the user has asked for them.
- Keep every change within the named repository, branch, issue or pull request.
- For code changes, prefer a feature branch and pull request. Do not write directly to the default branch unless the user explicitly requests it.
- Before editing a file, inspect its current content and revision. Use `create_or_update_file` or `push_files` only when their live schemas fit the requested change.
- Show or clearly summarise broad, destructive or difficult-to-reverse changes before requesting approval.
- Do not merge pull requests, close issues, delete branches or releases, or trigger workflows unless the user explicitly requests that action.

## Pull requests

Before creating a pull request:

1. Check the repository's pull-request template and contributing instructions when available.
2. Search for an existing pull request from the same head branch to avoid duplicates.
3. Verify the repository owner, repository, base branch and head branch.
4. Summarise the changes and verification results in the pull-request body.
5. Call the GitHub MCP pull-request creation tool and read back the created pull request.

Use GitHub MCP for subsequent comments, reviews and updates. Preserve approval gates for all write tools.
