import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "anstar-sales-crm"
DATAVERSE_PLUGIN = ROOT / "plugins" / "anstar-dataverse"
SALES_PLUGIN = ROOT / "plugins" / "anstar-sales"
MS365_PLUGIN = ROOT / "plugins" / "ms-365-mcp-server"
CLICKUP_PLUGIN = ROOT / "plugins" / "clickup"
GITHUB_PLUGIN = ROOT / "plugins" / "github"
PLAUD_PLUGIN = ROOT / "plugins" / "plaud"


class MvpContractTests(unittest.TestCase):
    def test_sales_plugin_owns_workflows_but_not_the_crm_connection(self):
        manifest = json.loads((SALES_PLUGIN / ".codex-plugin/plugin.json").read_text())
        self.assertEqual(manifest["name"], "anstar-sales")
        self.assertEqual(manifest["skills"], "./skills/")
        self.assertNotIn("mcpServers", manifest)
        self.assertFalse((SALES_PLUGIN / ".mcp.json").exists())

    def test_sales_plugin_routes_bounded_workflows_through_crm(self):
        expected = {
            "index",
            "sales-help",
            "analyze-account-signals",
            "prioritize-accounts",
            "prepare-for-meeting",
            "weekly-pipeline-review",
            "crm-research-router",
        }
        skills = sorted((SALES_PLUGIN / "skills").glob("*/SKILL.md"))
        self.assertEqual({skill.parent.name for skill in skills}, expected)
        for skill in skills:
            text = skill.read_text()
            match = re.match(r"^---\n(?P<frontmatter>.*?)\n---\n", text, re.S)
            if match is None:
                self.fail(f"Missing frontmatter: {skill}")
            frontmatter = match.group("frontmatter")
            self.assertIn("name:", frontmatter)
            self.assertIn("description:", frontmatter)
            description = re.search(r"^description:\s*(.+)$", frontmatter, re.M)
            if description is None:
                self.fail(f"Missing description value: {skill}")
            self.assertLessEqual(len(description.group(1).strip('"')), 60)
            self.assertIn("read-only", text.lower(), skill)

        index = (SALES_PLUGIN / "skills/index/SKILL.md").read_text().lower()
        for route in expected - {"index"}:
            self.assertIn(route, index)
        self.assertIn("crm", index)
        self.assertIn("anstar-dataverse", index)
        self.assertIn("missing", index)
        self.assertIn("browser automation", index)

        crm_workflows = expected - {"index", "sales-help"}
        for name in crm_workflows:
            with self.subTest(skill=name):
                text = (SALES_PLUGIN / f"skills/{name}/SKILL.md").read_text()
                self.assertIn("CRM", text)
                self.assertIn("anstar-dataverse", text)
                self.assertIn("crm-read-safety", text)

    def test_sales_plugin_contains_no_provider_or_oauth_binding(self):
        manifest = json.loads((SALES_PLUGIN / ".codex-plugin/plugin.json").read_text())
        serialized = json.dumps(manifest).lower()
        for forbidden in (
            "clientid",
            "callbackport",
            "mcp.tools",
            "salesforce",
            "hubspot",
            "gong",
            "zoominfo",
        ):
            self.assertNotIn(forbidden, serialized)
        notice = (ROOT / "THIRD_PARTY_NOTICES.md").read_text()
        self.assertIn("openai/role-specific-plugins", notice)
        self.assertIn("fe5608d2512a7d6a7b9821ce8a88c48464ecd6e4", notice)
        self.assertIn("MIT License", notice)

    def test_dataverse_plugin_owns_the_shared_mcp_connection(self):
        manifest = json.loads(
            (DATAVERSE_PLUGIN / ".codex-plugin/plugin.json").read_text()
        )
        self.assertEqual(manifest["name"], "anstar-dataverse")
        self.assertEqual(manifest["mcpServers"], "./.mcp.json")
        self.assertTrue((DATAVERSE_PLUGIN / manifest["mcpServers"]).exists())
        self.assertTrue((DATAVERSE_PLUGIN / manifest["skills"]).is_dir())

        serialized = json.dumps(manifest).lower()
        for sales_only_phrase in ("seller", "meeting", "pipeline", "prioritize"):
            self.assertNotIn(sales_only_phrase, serialized)

    def test_dataverse_plugin_preserves_the_proven_read_policy(self):
        config = json.loads((DATAVERSE_PLUGIN / ".mcp.json").read_text())
        server = config["mcpServers"]["anstar-dataverse"]
        self.assertEqual(
            server["url"],
            "https://anstar-prod.crm11.dynamics.com/api/mcp",
        )
        self.assertEqual(
            set(server["enabled_tools"]),
            {"read_query", "search", "search_data", "describe"},
        )
        self.assertEqual(server["default_tools_approval_mode"], "approve")
        self.assertEqual(
            server["oauth"],
            {
                "clientId": "65649345-8fb7-477a-820b-5604b5e2afe3",
                "callbackPort": 8765,
            },
        )
        self.assertEqual(
            server["scopes"],
            [
                "openid",
                "profile",
                "offline_access",
                "https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools",
            ],
        )
        self.assertNotIn("oauth_resource", server)

    def test_dataverse_plugin_has_role_neutral_source_skills(self):
        expected = {"index", "crm-read-safety", "dataverse-research"}
        skills = sorted((DATAVERSE_PLUGIN / "skills").glob("*/SKILL.md"))
        self.assertEqual({skill.parent.name for skill in skills}, expected)
        for skill in skills:
            text = skill.read_text()
            match = re.match(r"^---\n(?P<frontmatter>.*?)\n---\n", text, re.S)
            if match is None:
                self.fail(f"Missing frontmatter: {skill}")
            self.assertIn("name:", match.group("frontmatter"))
            self.assertIn("description:", match.group("frontmatter"))
            self.assertIn("read-only", text.lower(), skill)

        source_text = "\n".join(skill.read_text().lower() for skill in skills)
        for sales_only_phrase in (
            "meeting preparation",
            "prioritize accounts",
            "weekly pipeline",
        ):
            self.assertNotIn(sales_only_phrase, source_text)

    def test_dataverse_safety_carries_sensitive_field_exclusions(self):
        safety = (
            DATAVERSE_PLUGIN / "skills/crm-read-safety/SKILL.md"
        ).read_text().lower()
        for exclusion in (
            "activity/email bodies",
            "recipient/address fields",
            "notes",
            "attachments",
            "mobile/phone numbers",
            "personal email",
            "postal addresses",
        ):
            with self.subTest(exclusion=exclusion):
                self.assertIn(exclusion, safety)
        self.assertIn("not proof of row or secured-field permission", safety)

    def test_marketplace_points_to_existing_plugin(self):
        marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
        entries = {entry["name"]: entry for entry in marketplace["plugins"]}
        self.assertEqual(
            set(entries),
            {
                "anstar-dataverse",
                "anstar-sales",
                "anstar-sales-crm",
                "ms-365-mcp-server",
                "clickup",
                "github",
                "plaud",
            },
        )
        for entry in entries.values():
            self.assertTrue((ROOT / entry["source"]["path"]).is_dir())
        self.assertEqual(entries["github"]["category"], "Developer Tools")

        self.assertEqual(
            entries["anstar-dataverse"]["policy"]["authentication"],
            "ON_INSTALL",
        )
        self.assertEqual(
            entries["anstar-sales"]["policy"]["authentication"],
            "ON_USE",
        )
        for name in ("ms-365-mcp-server", "clickup", "github", "plaud"):
            self.assertEqual(entries[name]["policy"]["authentication"], "ON_INSTALL")

    def test_shared_productivity_plugins_are_portable_and_bounded(self):
        marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
        names = {entry["name"] for entry in marketplace["plugins"]}
        self.assertNotIn("teams", names)
        self.assertNotIn("sharepoint", names)
        self.assertNotIn("businesscentral", " ".join(sorted(names)).lower())

        ms365 = json.loads((MS365_PLUGIN / ".mcp.json").read_text())["mcpServers"]["ms365"]
        self.assertEqual(ms365["command"], "cmd")
        self.assertEqual(
            ms365["args"][:4],
            ["/c", "npx", "-y", "@softeria/ms-365-mcp-server@0.148.2"],
        )
        self.assertIn("--org-mode", ms365["args"])
        self.assertNotIn("--read-only", ms365["args"])
        self.assertNotIn("env", ms365)

        clickup = json.loads((CLICKUP_PLUGIN / ".mcp.json").read_text())["mcpServers"]["clickup"]
        self.assertEqual(clickup["type"], "http")
        self.assertEqual(clickup["url"], "https://mcp.clickup.com/mcp")
        self.assertNotIn("command", clickup)

        clickup_manifest = json.loads(
            (CLICKUP_PLUGIN / ".codex-plugin/plugin.json").read_text()
        )
        self.assertEqual(clickup_manifest["apps"], "./.app.json")
        self.assertNotIn("mcpServers", clickup_manifest)
        clickup_app = json.loads((CLICKUP_PLUGIN / ".app.json").read_text())["apps"][
            "clickup"
        ]
        self.assertEqual(
            clickup_app["id"],
            "asdk_app_69431e6d26b88191b4029488aeb42f5b",
        )
        self.assertTrue(clickup_app["required"])

        github = json.loads((GITHUB_PLUGIN / ".mcp.json").read_text())["mcpServers"]["github"]
        self.assertEqual(github["type"], "http")
        self.assertEqual(
            github["url"],
            "https://api.githubcopilot.com/mcp/x/all",
        )
        self.assertEqual(github["default_tools_approval_mode"], "writes")
        self.assertNotIn("command", github)

        plaud = json.loads((PLAUD_PLUGIN / ".mcp.json").read_text())["mcpServers"]["plaud"]
        self.assertEqual(plaud["command"], "npx")
        self.assertEqual(plaud["args"], ["-y", "@plaud-ai/mcp@0.3.10"])

        for name, root in {
            "ms-365-mcp-server": MS365_PLUGIN,
            "github": GITHUB_PLUGIN,
            "plaud": PLAUD_PLUGIN,
        }.items():
            manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
            self.assertEqual(manifest["name"], name)
            self.assertEqual(manifest["mcpServers"], "./.mcp.json")
            self.assertTrue((root / manifest["mcpServers"]).is_file())
            self.assertLessEqual(len(manifest["interface"]["defaultPrompt"]), 3)

        github_manifest = json.loads(
            (GITHUB_PLUGIN / ".codex-plugin/plugin.json").read_text()
        )
        self.assertIn("Write", github_manifest["interface"]["capabilities"])
        self.assertEqual(github_manifest["skills"], "./skills/")

    def test_public_docs_install_dataverse_before_sales(self):
        readme = (ROOT / "README.md").read_text()
        install = (ROOT / "docs/INSTALL-FOR-EVERYONE.md").read_text()
        migration = (ROOT / "docs/PLUGIN-MIGRATION.md").read_text()
        for text in (readme, install, migration):
            self.assertLess(text.find("Anstar Dataverse"), text.find("Anstar Sales"))
        self.assertIn("legacy", migration.lower())
        self.assertIn("anstar-sales-crm", migration)

    def test_composition_spike_records_sanitized_live_verification(self):
        spike = (
            ROOT / "spikes/002-dataverse-sales-composition/README.md"
        ).read_text().lower()
        for expected in (
            "result: `pass`",
            "`weekly-pipeline-review`",
            "`crm-read-safety`",
            "`describe`, then `read_query`",
            "mutation tools called: none",
        ):
            self.assertIn(expected, spike)

    def test_plugin_manifest_paths_resolve(self):
        manifest = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text())
        self.assertEqual(manifest["interface"]["capabilities"], ["Read"])
        for key in ("skills", "mcpServers"):
            self.assertTrue((PLUGIN / manifest[key]).resolve().exists(), key)

    def test_bundled_mcp_policy_is_read_only(self):
        config = json.loads((PLUGIN / ".mcp.json").read_text())
        server = config["mcpServers"]["anstar-dataverse"]
        self.assertEqual(
            set(server["enabled_tools"]),
            {"read_query", "search", "search_data", "describe"},
        )
        self.assertEqual(server["default_tools_approval_mode"], "approve")
        self.assertEqual(
            server["oauth"],
            {
                "clientId": "65649345-8fb7-477a-820b-5604b5e2afe3",
                "callbackPort": 8765,
            },
        )
        self.assertIn(
            "https://anstar-prod.crm11.dynamics.com/api/mcp/mcp.tools",
            server["scopes"],
        )
        self.assertNotIn(
            "oauth_resource",
            server,
            "Dataverse discovery already supplies the OAuth resource indicator",
        )

    def test_skill_frontmatter_and_read_only_wording(self):
        skills = sorted((PLUGIN / "skills").glob("*/SKILL.md"))
        expected = {
            "analyze-account-signals",
            "crm-read-safety",
            "crm-research-router",
            "index",
            "prepare-for-meeting",
            "prioritize-accounts",
            "sales-help",
            "weekly-pipeline-review",
        }
        self.assertEqual({skill.parent.name for skill in skills}, expected)
        for skill in skills:
            text = skill.read_text()
            match = re.match(r"^---\n(?P<frontmatter>.*?)\n---\n", text, re.S)
            if match is None:
                self.fail(f"Missing frontmatter: {skill}")
            frontmatter = match.group("frontmatter")
            self.assertIn("name:", frontmatter)
            self.assertIn("description:", frontmatter)
            self.assertIn("read-only", text.lower(), skill)

    def test_sales_index_routes_every_bounded_mvp_intent(self):
        index = (PLUGIN / "skills/index/SKILL.md").read_text().lower()
        routes = {
            "help": "sales-help",
            "signals": "analyze-account-signals",
            "priorities": "prioritize-accounts",
            "meeting": "prepare-for-meeting",
            "pipeline": "weekly-pipeline-review",
            "free-form crm": "crm-research-router",
        }
        for intent, skill_name in routes.items():
            with self.subTest(intent=intent):
                self.assertIn(skill_name, index)
        self.assertIn("crm-read-safety", index)

    def test_workflows_compose_the_shared_crm_source_and_safety_policy(self):
        workflows = {
            "analyze-account-signals",
            "crm-research-router",
            "prepare-for-meeting",
            "prioritize-accounts",
            "weekly-pipeline-review",
        }
        for name in workflows:
            with self.subTest(skill=name):
                text = (PLUGIN / f"skills/{name}/SKILL.md").read_text()
                self.assertIn("anstar-dataverse", text)
                self.assertIn("crm-read-safety", text)

    def test_safety_skill_carries_verified_sensitive_field_exclusions(self):
        safety = (PLUGIN / "skills/crm-read-safety/SKILL.md").read_text().lower()
        for exclusion in (
            "activity/email bodies",
            "recipient/address fields",
            "notes",
            "attachments",
            "mobile/phone numbers",
            "personal email",
            "postal addresses",
        ):
            with self.subTest(exclusion=exclusion):
                self.assertIn(exclusion, safety)
        self.assertIn("not proof of row or secured-field permission", safety)

    def test_adaptation_carries_openai_mit_notice(self):
        notice = (ROOT / "THIRD_PARTY_NOTICES.md").read_text()
        self.assertIn("openai/role-specific-plugins", notice)
        self.assertIn("Copyright (c) 2026 OpenAI", notice)
        self.assertIn("MIT License", notice)

    def test_manifest_orients_users_to_the_role_mvp(self):
        manifest = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text())
        self.assertTrue(manifest["version"].startswith("0.2.0-mvp.1+codex."))
        prompts = " ".join(manifest["interface"]["defaultPrompt"]).lower()
        for phrase in ("what can you do", "what changed", "focus on", "meeting"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, prompts)
        serialized = json.dumps(manifest).lower()
        for irrelevant_provider in ("salesforce", "hubspot", "gong", "zoominfo"):
            self.assertNotIn(irrelevant_provider, serialized)

    def test_codex_policy_enables_only_approved_read_tools(self):
        policy = (ROOT / "config/codex-readonly-policy.toml").read_text()
        match = re.search(r"enabled_tools\s*=\s*\[(?P<tools>.*?)\]", policy, re.S)
        if match is None:
            self.fail("Missing enabled_tools policy")
        tools = set(re.findall(r'"([a-z_]+)"', match.group("tools")))
        self.assertEqual(
            tools,
            {"read_query", "search", "search_data", "describe"},
        )
        self.assertNotIn("create_record", tools)
        self.assertNotIn("update_record", tools)
        self.assertNotIn("delete_record", tools)


if __name__ == "__main__":
    unittest.main()
