# Anstar Dataverse and Sales Plugin Split Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Split the working combined Sales/Dataverse package into a reusable `anstar-dataverse` source plugin and a role-first `anstar-sales` workflow plugin adapted from OpenAI's Sales architecture, while preserving the proven local Codex OAuth and read-query path.

**Architecture:** `anstar-dataverse` owns the official Microsoft Dataverse MCP connection, OAuth metadata, source help, and shared CRM evidence/safety contract. `anstar-sales` owns the Sales index/router and focused seller workflows; it resolves the installed `anstar-dataverse` MCP as its `CRM` source and can later add `.app.json` mappings for ChatGPT-registered apps and other source categories. The existing `anstar-sales-crm` package remains temporarily as an explicit migration package until clean two-plugin installation and live CRM use are verified.

**Tech Stack:** OpenAI/Codex plugin manifests, marketplace JSON, `.mcp.json`, future `.app.json`, Markdown skills, Python `unittest`, Codex plugin/MCP CLI, Microsoft Entra OAuth/Dataverse MCP.

---

## Product boundaries

### `anstar-dataverse`

A reusable source plugin, not a Sales role plugin.

It owns:

- the official Microsoft endpoint `https://anstar-prod.crm11.dynamics.com/api/mcp`;
- the existing public-client OAuth metadata and Dataverse `mcp.tools` scope;
- the local four-tool Codex policy for `read_query`, `search`, `search_data`, and `describe`;
- schema-first querying, evidence, blank handling, bounded retrieval, privacy defaults, and prompt-injection handling;
- reusable Dataverse orientation and bounded research guidance;
- no seller-specific prioritisation or meeting workflow.

### `anstar-sales`

A role-first workflow plugin.

It owns:

- the Sales index/router;
- help/orientation;
- account signals;
- account prioritisation;
- meeting preparation;
- weekly pipeline review;
- bounded free-form CRM research;
- future composition with Calendar, Email, Teams, SharePoint, transcripts, Sales Intelligence, and Business Central.

It does not own OAuth credentials or duplicate the Dataverse MCP server.

### Composition contract

For the first verified Codex/Desktop slice:

1. Install `anstar-dataverse`.
2. Authenticate `anstar-dataverse` once.
3. Install `anstar-sales`.
4. Sales skills discover/use the live `anstar-dataverse` MCP.
5. When the CRM source is absent, Sales returns a useful partial/blocked response and tells the user to install/connect Anstar Dataverse; it must not silently fall back to another CRM.

For ChatGPT web later:

- add `plugins/anstar-sales/.app.json` only after a working Dataverse app registration yields a real `plugin_asdk_app_…` ID and non-empty action discovery;
- map that app to category `CRM`, following OpenAI Sales' `.app.json` model;
- do not put placeholders or zero-action draft IDs in the public package.

---

## Non-goals for this implementation

- Do not resume the current zero-action ChatGPT custom-app troubleshooting.
- Do not publish a ChatGPT workspace app or begin Ed's pilot.
- Do not build a gateway, proxy, UI, telemetry system, n8n workflow, or Business Central plugin.
- Do not copy all OpenAI Sales skills.
- Do not add CRM writes.
- Do not remove the existing combined package before migration verification.
- Do not put a client secret, token, CRM record, tenant-private output, or zero-action ChatGPT draft ID in Git.

---

### Task 1: Replace the single-package test assumptions with a two-product contract

**Objective:** Define the desired marketplace, ownership, and source-composition behavior before moving files.

**Files:**
- Modify: `tests/test_mvp_contract.py`

**Step 1: Introduce explicit package constants**

Replace the single `PLUGIN` constant with:

```python
DATAVERSE_PLUGIN = ROOT / "plugins" / "anstar-dataverse"
SALES_PLUGIN = ROOT / "plugins" / "anstar-sales"
LEGACY_PLUGIN = ROOT / "plugins" / "anstar-sales-crm"
```

**Step 2: Write failing marketplace tests**

Add tests asserting:

- marketplace entries include exactly the new active products `anstar-dataverse` and `anstar-sales`, plus the temporary legacy migration package;
- all `source.path` values resolve;
- Dataverse is categorized as a developer/data source capability;
- Sales is categorized as Business & Operations/Productivity;
- active package names are unique;
- the Sales product does not bundle `.mcp.json` through `mcpServers`;
- the Dataverse product does bundle `.mcp.json`;
- the legacy package is not presented as the recommended current Sales package.

Use an explicit expected set rather than relying on entry order.

**Step 3: Write failing ownership tests**

Assert:

```python
self.assertTrue((DATAVERSE_PLUGIN / ".mcp.json").exists())
self.assertFalse((SALES_PLUGIN / ".mcp.json").exists())
self.assertNotIn("mcpServers", sales_manifest)
self.assertEqual(dataverse_manifest["mcpServers"], "./.mcp.json")
```

Assert that the Dataverse plugin owns `crm-read-safety`, while the Sales plugin does not duplicate that skill.

**Step 4: Run tests and verify RED**

Run:

```bash
python3 -m unittest tests/test_mvp_contract.py -v
```

Expected: failures because `plugins/anstar-dataverse` and `plugins/anstar-sales` do not exist and the marketplace still exposes only the combined package.

**Step 5: Commit the contract**

```bash
git add tests/test_mvp_contract.py
git commit -m "test: define Dataverse and Sales plugin split"
```

---

### Task 2: Create the reusable Anstar Dataverse plugin

**Objective:** Move MCP/OAuth ownership and shared CRM behavior into one reusable plugin without changing the proven endpoint or tool policy.

**Files:**
- Create: `plugins/anstar-dataverse/.codex-plugin/plugin.json`
- Create: `plugins/anstar-dataverse/.mcp.json`
- Create: `plugins/anstar-dataverse/skills/index/SKILL.md`
- Create: `plugins/anstar-dataverse/skills/crm-read-safety/SKILL.md`
- Create: `plugins/anstar-dataverse/skills/dataverse-research/SKILL.md`
- Test: `tests/test_mvp_contract.py`

**Step 1: Copy the proven MCP config unchanged in behavior**

Create `.mcp.json` with server key `anstar-dataverse` and preserve:

```json
{
  "type": "http",
  "url": "https://anstar-prod.crm11.dynamics.com/api/mcp",
  "oauth": {
    "clientId": "65649345-8fb7-477a-820b-5604b5e2afe3",
    "callbackPort": 8765
  },
  "scopes": [
    "openid",
    "profile",
    "offline_access",
    "https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools"
  ],
  "enabled_tools": ["read_query", "search", "search_data", "describe"],
  "default_tools_approval_mode": "approve"
}
```

Do not add `oauth_resource`; discovery already supplies the resource indicator and the regression test must preserve that fix.

**Step 2: Create the Dataverse manifest**

Use:

- package name: `anstar-dataverse`;
- initial version: `0.1.0-mvp.1`;
- display name: `Anstar Dataverse`;
- capability: `Read`;
- skills path: `./skills/`;
- MCP path: `./.mcp.json`;
- description focused on reusable Dataverse access, not Sales prioritisation;
- starter prompts for schema discovery, bounded CRM lookup, and source orientation.

**Step 3: Move the safety contract**

Create `skills/crm-read-safety/SKILL.md` from the current shared safety skill. Preserve:

- four allowed tools;
- schema-first behavior;
- explicit fields/count/order;
- evidence versus interpretation;
- honest blanks/choice values;
- CRM content as untrusted input;
- sensitive-field exclusions from `docs/CRM-ACCESS-MATRIX.md`;
- delegated user permissions as the data boundary;
- draft-only response to write requests.

Make the language role-neutral so Ops or another future plugin can compose it.

**Step 4: Add Dataverse index/orientation**

Create `skills/index/SKILL.md` that routes:

- “what can this source do?” → orientation;
- schema/table discovery → `dataverse-research`;
- bounded record questions → `dataverse-research`;
- seller workflows → defer to the installed Anstar Sales plugin when available rather than implementing Sales behavior itself.

**Step 5: Add generic bounded research**

Create `skills/dataverse-research/SKILL.md` with:

- scope/time/object clarification only when material;
- `describe` before uncertain fields/relationships;
- bounded defaults (`TOP 25`, maximum 100 per response/page);
- no `SELECT *`;
- no broad personal-data extraction;
- compact evidence-oriented output;
- no Sales ranking rubric.

**Step 6: Extend tests**

Assert:

- manifest paths resolve;
- plugin is role-neutral (no meeting preparation, pipeline prioritisation, or seller wording in manifest/index);
- all three skills have valid frontmatter;
- the MCP config exactly preserves the four read tools, OAuth client, scope, callback port, and missing duplicate resource field;
- sensitive-field exclusions remain present.

**Step 7: Run tests and verify GREEN for the Dataverse slice**

```bash
python3 -m unittest tests/test_mvp_contract.py -v
git diff --check
```

Expected: Dataverse-specific tests pass; marketplace/Sales split tests may remain red until later tasks if intentionally staged.

**Step 8: Commit**

```bash
git add plugins/anstar-dataverse tests/test_mvp_contract.py
git commit -m "feat: add reusable Anstar Dataverse plugin"
```

---

### Task 3: Create the role-first Anstar Sales plugin

**Objective:** Move the already-adapted Sales router and workflows into an independent role package that consumes, but does not own, Dataverse.

**Files:**
- Create: `plugins/anstar-sales/.codex-plugin/plugin.json`
- Create: `plugins/anstar-sales/skills/index/SKILL.md`
- Create: `plugins/anstar-sales/skills/sales-help/SKILL.md`
- Create: `plugins/anstar-sales/skills/analyze-account-signals/SKILL.md`
- Create: `plugins/anstar-sales/skills/prioritize-accounts/SKILL.md`
- Create: `plugins/anstar-sales/skills/prepare-for-meeting/SKILL.md`
- Create: `plugins/anstar-sales/skills/weekly-pipeline-review/SKILL.md`
- Create: `plugins/anstar-sales/skills/crm-research-router/SKILL.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Test: `tests/test_mvp_contract.py`

**Step 1: Copy the bounded role workflows**

Move the current seven role skills from `plugins/anstar-sales-crm/skills/` into `plugins/anstar-sales/skills/`, excluding `crm-read-safety` because Dataverse now owns it.

**Step 2: Make source dependencies explicit and abstract**

In every CRM-backed focused skill include a short dependency section such as:

```markdown
## Dependency categories

- `CRM` [Blocking for CRM-grounded claims]

Resolve `CRM` through the installed `anstar-dataverse` MCP/plugin. If it is unavailable, use equivalent user-provided context only when the workflow permits it; otherwise explain the limitation and offer installation/connection of Anstar Dataverse.
```

Use `CRM` as the abstract category and `anstar-dataverse` as the Anstar-preferred provider. Do not introduce Salesforce/HubSpot placeholders.

**Step 3: Update the Sales router**

Preserve the focused routes:

- help/orientation;
- account signals;
- account prioritisation;
- meeting preparation;
- weekly pipeline review;
- free-form CRM research.

Add dependency resolution rules modeled on OpenAI Sales:

1. prefer a focused workflow;
2. resolve required source categories before claiming evidence;
3. search/discover live tools before declaring Dataverse unavailable;
4. one suitable source satisfies `CRM`;
5. Dataverse is authoritative for customer/opportunity truth;
6. missing non-blocking sources produce a useful partial result;
7. missing blocking CRM produces a clear install/connect or pasted-context path;
8. never use browser automation as a substitute CRM source.

**Step 4: Create the Sales manifest**

Use:

- package name: `anstar-sales`;
- version: `0.1.0-mvp.1`;
- display name: `Anstar Sales`;
- category: `Business & Operations` where accepted, otherwise the existing supported category;
- capability: `Read`;
- skills only for this stage;
- no `mcpServers` field;
- no `.mcp.json`;
- current starter prompts and OpenAI MIT attribution.

**Step 5: Add focused tests**

Assert:

- Sales manifest has skills but no MCP ownership;
- expected seven skills exist;
- Sales index routes every bounded intent;
- each CRM-backed workflow names category `CRM`, preferred source `anstar-dataverse`, and shared policy `crm-read-safety` supplied by the source plugin;
- router handles missing CRM explicitly;
- manifest contains no Salesforce, HubSpot, Gong, or ZoomInfo provider bindings;
- third-party notice retains the exact OpenAI repository revision and MIT terms.

**Step 6: Run the focused suite**

```bash
python3 -m unittest tests/test_mvp_contract.py -v
git diff --check
```

Expected: all package structure/router tests pass except marketplace migration tests still awaiting Task 4.

**Step 7: Commit**

```bash
git add plugins/anstar-sales THIRD_PARTY_NOTICES.md tests/test_mvp_contract.py
git commit -m "feat: add role-first Anstar Sales plugin"
```

---

### Task 4: Publish both products in the marketplace while retaining a migration path

**Objective:** Make the two new products installable without silently breaking existing `anstar-sales-crm` users.

**Files:**
- Modify: `.agents/plugins/marketplace.json`
- Modify: `README.md`
- Modify: `docs/INSTALL-FOR-EVERYONE.md`
- Create: `docs/PLUGIN-MIGRATION.md`
- Test: `tests/test_mvp_contract.py`

**Step 1: Add marketplace entries**

Add:

```json
{
  "name": "anstar-dataverse",
  "source": {"source": "local", "path": "./plugins/anstar-dataverse"},
  "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
  "category": "Developer Tools"
}
```

and:

```json
{
  "name": "anstar-sales",
  "source": {"source": "local", "path": "./plugins/anstar-sales"},
  "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
  "category": "Business & Operations"
}
```

If the marketplace validator rejects a category, use an existing accepted category and document the fallback.

Retain `anstar-sales-crm` temporarily but make documentation clearly identify it as the legacy combined MVP. Do not claim marketplace metadata supports a `deprecated` key unless the schema confirms it.

**Step 2: Write the migration guide**

Document the safe sequence:

```text
1. Upgrade the anstar-ai marketplace.
2. Install Anstar Dataverse.
3. Confirm/authenticate anstar-dataverse.
4. Install Anstar Sales.
5. Start a new chat and run a bounded account/pipeline prompt.
6. Only after successful verification, remove/disable the legacy Anstar Sales CRM package.
```

Warn that enabling both legacy and new source packages may create a duplicate server-key conflict or confusing duplicate skills. The verification must determine actual behavior before recommending simultaneous enablement.

**Step 3: Update public README/install instructions**

Lead with:

```text
Anstar Dataverse — reusable Microsoft Dataverse source
Anstar Sales — role-first seller workflows using approved sources
```

Provide click-first install guidance and CLI equivalents for technical testing.

Do not mention the failed ChatGPT zero-action drafts as a required setup path.

**Step 4: Complete marketplace tests**

Assert:

- all source paths resolve;
- active product metadata is distinct;
- Dataverse owns authentication/MCP;
- Sales owns workflows;
- legacy package remains deliberately present for migration only;
- documentation specifies Dataverse before Sales.

**Step 5: Run tests**

```bash
python3 -m unittest tests/test_mvp_contract.py -v
git diff --check
```

Expected: all repository contract tests pass.

**Step 6: Commit**

```bash
git add .agents/plugins/marketplace.json README.md docs/INSTALL-FOR-EVERYONE.md docs/PLUGIN-MIGRATION.md tests/test_mvp_contract.py
git commit -m "docs: publish Dataverse and Sales plugin split"
```

---

### Task 5: Verify clean two-plugin installation in an isolated Codex home

**Objective:** Prove that source/plugin composition works without relying on Mohamed's existing plugin cache or credentials.

**Files:**
- Modify if needed: `spikes/001-local-plugin-install/README.md`
- Create: `spikes/002-dataverse-sales-composition/README.md`
- Test: `tests/test_mvp_contract.py` only if a packaging bug requires a new contract

**Step 1: Create an isolated Codex home**

Use a temporary directory and set `CODEX_HOME` only for the command process. Do not print or copy OAuth tokens.

**Step 2: Add the public marketplace**

```bash
codex plugin marketplace add https://github.com/Anstar-Ltd/anstar-ai-marketplace.git --ref <test-branch> --json
```

During pre-merge testing, use the implementation branch/ref. After merge, repeat against `main`.

**Step 3: Install only Dataverse first**

```bash
codex plugin add anstar-dataverse@anstar-ai --json
codex plugin list
codex mcp get anstar-dataverse --json
```

Verify:

- plugin installed and enabled;
- OAuth client and scope arrived;
- effective enabled tools are exactly the four approved reads;
- no legacy Sales skills arrived.

**Step 4: Install Sales second**

```bash
codex plugin add anstar-sales@anstar-ai --json
codex plugin list
codex mcp get anstar-dataverse --json
```

Verify:

- both plugins are enabled;
- only one effective `anstar-dataverse` server exists;
- Sales did not duplicate MCP configuration;
- Sales skills are cached/visible;
- Dataverse safety/research skills remain available.

**Step 5: Test the missing-source behavior separately**

In another clean temporary home, install only `anstar-sales`. Start a non-live/local inspection and verify the package does not invent CRM data and explains that Anstar Dataverse is required for CRM-grounded workflows.

Do not authenticate or query live CRM from disposable homes unless the user explicitly approves the native OAuth handoff.

**Step 6: Record sanitized evidence**

Write `spikes/002-dataverse-sales-composition/README.md` with:

- commands run;
- versions installed;
- effective server/tool count;
- whether duplicate server conflicts occurred;
- whether Sales-only missing-source behavior was correct;
- no tokens, CRM values, customer names, GUIDs, tenant secrets, or raw records.

**Step 7: Commit**

```bash
git add spikes/002-dataverse-sales-composition/README.md
git commit -m "test: verify Dataverse and Sales plugin composition"
```

---

### Task 6: Verify the real authenticated local workflow before retiring the legacy package

**Objective:** Prove the split packages can complete one real bounded Sales workflow using the normal delegated identity.

**Files:**
- Modify: `spikes/002-dataverse-sales-composition/README.md`
- Modify: `docs/PLUGIN-MIGRATION.md` if behavior differs from expectation

**Step 1: Upgrade the real local marketplace**

Use the verified branch/main only after parent review.

**Step 2: Install Dataverse and authenticate**

Use the existing native OAuth flow with the normal account. Use a fresh Chrome Guest profile for sign-in; never reuse or close existing browser sessions.

**Step 3: Install Sales**

Do not remove the legacy package until the new pair is verified. If enabling both creates duplicate names/server conflicts, disable the legacy package temporarily rather than deleting it.

**Step 4: Inspect effective policy**

```bash
codex plugin list
codex mcp get anstar-dataverse --json
```

Verify exactly four enabled read tools.

**Step 5: Run one bounded Sales evaluation**

Use a harmless prompt such as:

```text
Use Anstar Sales and the installed Anstar Dataverse source. Review at most three accessible open opportunities using explicit fields. Separate CRM facts from recommendations and do not change records.
```

Verify:

- Sales router/focused workflow activates;
- Dataverse source supplies the tool;
- schema is inspected when needed;
- only `describe`/`read_query` or another approved read tool is called;
- returned blanks are honest;
- no writes are exposed/called;
- no sensitive output is committed.

**Step 6: Test one free-form Dataverse question outside Sales**

Confirm `anstar-dataverse` can answer a bounded generic schema/read question without invoking Sales prioritisation.

**Step 7: Update the migration evidence**

Record only non-sensitive outcomes and tool names/classes.

**Step 8: Decide legacy removal in a human checkpoint**

Present Mohamed with:

1. remove the legacy marketplace entry now;
2. retain it for one release marked in documentation as migration-only;
3. retain but hide from normal install guidance until Ed completes the pilot.

Recommended default: option 3 until Ed verifies the new pair.

---

### Task 7: Prepare, but do not activate, ChatGPT app bindings

**Objective:** Keep the architecture ready for ChatGPT web without blocking the local plugin split on the current zero-action Dataverse draft.

**Files:**
- Create: `docs/CHATGPT-APP-BINDING.md`
- Do not create yet: `plugins/anstar-sales/.app.json`
- Do not create yet: `plugins/anstar-dataverse/.app.json`

**Step 1: Document the future mapping**

Record the intended shape once a working registered app exists:

```json
{
  "apps": {
    "anstar_dataverse": {
      "id": "plugin_asdk_app_<verified-working-id>",
      "category": "CRM"
    }
  }
}
```

**Step 2: Define the activation gate**

Do not add `.app.json` until all are true:

- ChatGPT action discovery is non-empty;
- authenticated normal-user read succeeds;
- the technical app ID is verified from the URL;
- draft/private testing works;
- the ID is intended to remain stable;
- workspace publication is explicitly approved.

**Step 3: Document future source categories**

Keep these as optional/non-blocking future mappings:

- `CRM` → Anstar Dataverse;
- `Calendar` → Outlook Calendar;
- `Email` → Outlook Email;
- `Internal Messaging` → Teams;
- `Knowledge & Files` → SharePoint;
- `Meeting Transcripts` → approved source;
- `ERP` → future Anstar Business Central plugin/app.

Do not put unverified connector IDs in the package.

**Step 4: Commit documentation**

```bash
git add docs/CHATGPT-APP-BINDING.md
git commit -m "docs: define future ChatGPT app binding gate"
```

---

### Task 8: Parent integration, review, and release gate

**Objective:** Integrate the split without weakening the working marketplace or claiming unsupported ChatGPT web behavior.

**Files:**
- Review all files above
- Update: `docs/MVP-NON-GOALS.md`
- Update: `README.md` only if integration findings require it

**Step 1: Inspect worker commits**

The parent must inspect actual diffs and verify worktree cleanliness. Worker summaries are not proof.

**Step 2: Integrate in a temporary branch/worktree**

Cherry-pick focused commits in order:

1. split contract tests;
2. Dataverse plugin;
3. Sales plugin;
4. marketplace/docs;
5. clean-install spike;
6. ChatGPT binding documentation.

**Step 3: Run combined repository gates**

```bash
python3 -m unittest tests/test_mvp_contract.py -v
git diff --check
```

Also verify JSON syntax for every manifest and catalog through the tests.

**Step 4: Run real Codex inspection**

```bash
codex plugin marketplace upgrade anstar-ai
codex plugin list
codex mcp get anstar-dataverse --json
```

Do not print tokens.

**Step 5: Verify public data hygiene**

Search tracked content and history for:

- client secrets/tokens;
- private keys;
- raw CRM values;
- customer names/record IDs from live tests;
- temporary zero-action ChatGPT callback IDs if they are not needed;
- private internal notes.

Identifiers intentionally required for public OAuth connection metadata may remain, but secrets may not.

**Step 6: Human-in-the-loop checkpoint**

Report:

- whether two-plugin composition worked;
- whether duplicate MCP server behavior occurred;
- whether the Sales-only missing-source path was useful;
- whether the legacy package should remain;
- whether the new pair is ready for Ed;
- whether ChatGPT web remains deferred.

Do not publish/retire anything beyond the approved marketplace merge without Mohamed's explicit decision.

**Step 7: Advance main only after the full gate**

```bash
git merge --ff-only <verified-integration-branch>
git push origin main
```

**Step 8: Reconcile ClickUp after verification**

Update only the exact completed slices:

- reusable Dataverse plugin packaging;
- role-first Sales plugin packaging;
- local composition verification;
- leave ChatGPT web publication and Ed pilot open until separately proven.

---

## Parallel execution strategy

After approval, use one parent orchestrator and three bounded workstreams:

### Worker A — Dataverse source plugin

Owns Tasks 1–2 on an isolated worktree. It must not edit Sales workflows except tests needed to express ownership.

### Worker B — Sales role plugin

Starts after Task 1's contracts are available, or from a branch containing them. Owns Task 3 and must not duplicate MCP/OAuth configuration.

### Worker C — Packaging/migration verification

Starts after A and B are integrated into a temporary branch. Owns Tasks 4–5 and sanitized install evidence.

### Parent-only work

- Task 6 authenticated live verification;
- Task 7 ChatGPT binding gate review;
- Task 8 integration, ClickUp reconciliation, release, and Ed-pilot decision.

Do not run overlapping edits to marketplace/tests in parallel without a defined integration owner. Worker A should establish contract tests first; Worker B rebases/starts from that contract; Worker C starts only after both products exist.

---

## Acceptance criteria

The split is accepted when:

- the public marketplace contains installable `anstar-dataverse` and `anstar-sales` products;
- Dataverse alone provides one working `anstar-dataverse` MCP with exactly four approved reads;
- Sales contains no `.mcp.json`, OAuth client, scope, or duplicated source server;
- Sales resolves Dataverse as category `CRM` and handles its absence honestly;
- the role router selects the intended bounded workflows;
- a clean Codex home can install the products in sequence;
- the normal delegated identity completes one bounded Sales workflow through the split;
- no write tool is exposed/called by the verified local policy;
- the legacy package has an explicit migration disposition;
- all tests and `git diff --check` pass;
- no secrets or live CRM records are committed;
- ChatGPT web is described as deferred until a verified non-empty registered app exists.

## Risks and tradeoffs

1. **No automatic plugin-to-plugin install dependency:** users may need to install Dataverse before Sales. Mitigate with clear install order, Sales missing-source guidance, and future `.app.json` binding.
2. **Cross-plugin skill discovery:** verify that Sales can invoke the Dataverse-owned safety contract after both plugins are enabled. If runtime skill lookup is package-isolated, keep a minimal safety contract in Sales and treat Dataverse as the canonical source rather than creating a brittle hard dependency.
3. **Duplicate server names during migration:** installing the legacy and new Dataverse packages together may conflict or shadow policy. Test before recommending simultaneous enablement.
4. **ChatGPT/Codex surface differences:** `.mcp.json` proves local/Codex packaging; `.app.json` is required for a registered ChatGPT connection. Do not claim one proves the other.
5. **Public OAuth identifiers versus secrets:** client ID, endpoint, and scopes are connection metadata; client secret and tokens remain out of Git/chat.
6. **Official upstream write tools:** local allowlisting remains defense in depth; backend Dataverse permissions remain authoritative.
7. **Role workflow overfitting:** retain free-form bounded research and source-category abstractions; do not expand to all OpenAI Sales skills before Ed demonstrates demand.

## Open questions for the first execution checkpoint

- Does Codex allow a skill in `anstar-sales` to compose/load `crm-read-safety` from `anstar-dataverse`, or must Sales keep a minimal local safety contract?
- Does installing the new Dataverse package while the legacy package remains enabled cause server-key collision, shadowing, or harmless deduplication?
- Which marketplace category values are accepted for `Developer Tools` and `Business & Operations` in the current Codex validator?
- Should the legacy package remain visible through Ed's pilot or be removed immediately after the split succeeds? Recommended: retain but stop recommending it until Ed verifies the new pair.
- Should `anstar-sales` require Dataverse for all current workflows, or allow pasted/uploaded equivalent CRM context for selected preparation workflows? Recommended: CRM blocks authoritative pipeline/account claims but user-provided context may support clearly labelled partial meeting preparation.
