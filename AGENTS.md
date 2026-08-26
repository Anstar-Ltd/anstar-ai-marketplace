# Anstar AI Marketplace agent instructions

This repository is Anstar's public marketplace for plugins, MCP connections, and skills used by ChatGPT/Codex clients. Public code and metadata must not expose private CRM data, credentials, tenant secrets, or internal personal context.

## Current product boundary

- The current Anstar Sales CRM MVP is read-only and supports customer/account briefs, pipeline review, and bounded CRM research.
- The local tool policy exposes only `read_query`, `search`, `search_data`, and `describe`.
- Local tool hiding is not a server-side authorization boundary. Preserve genuinely read-only Dataverse permissions and state this limitation honestly.
- Do not create, update, or delete CRM records as a verification step.
- The repository proves packaging, installation, skills, connection metadata, and bounded read workflows; it does not yet imply a production gateway, telemetry, complete legal metadata, or automated role provisioning.

## Development and verification

- Keep public artifacts free of secrets and customer data.
- Preserve least privilege and explicit evidence/blank handling.
- Run `python3 -m unittest tests/test_mvp_contract.py -v` and the relevant Codex plugin/MCP inspection commands before declaring integration work complete.
- Treat live Dataverse responses as sensitive client data; summarize only what the task requires.

## Session and orchestration hygiene

- Confirm the session is in **Client — Anstar — AI Marketplace**.
- Prefer the existing pinned marketplace orchestrator for connected work. Create a worker only for bounded implementation, compatibility testing, security review, or research with a defined return path.
- Use isolated branches/worktrees for parallel edits. The parent owns integration, release decisions, acceptance, and durable handoffs.
- Title sessions by objective; archive workers after their result is integrated.
- Reusable CRM research or packaging methods belong in repository skills, not repeated prompts or global memory.
- Do not create a Bot/profile, Kanban board, or routine merely to represent this project.
