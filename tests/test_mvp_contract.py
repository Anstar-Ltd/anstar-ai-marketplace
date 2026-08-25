import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "anstar-sales-crm"


class MvpContractTests(unittest.TestCase):
    def test_marketplace_points_to_existing_plugin(self):
        marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
        entry = marketplace["plugins"][0]
        self.assertEqual(entry["name"], "anstar-sales-crm")
        self.assertTrue((ROOT / entry["source"]["path"]).is_dir())

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

    def test_skill_frontmatter_and_read_only_wording(self):
        skills = sorted((PLUGIN / "skills").glob("*/SKILL.md"))
        self.assertEqual(len(skills), 3)
        for skill in skills:
            text = skill.read_text()
            match = re.match(r"^---\n(?P<frontmatter>.*?)\n---\n", text, re.S)
            if match is None:
                self.fail(f"Missing frontmatter: {skill}")
            frontmatter = match.group("frontmatter")
            self.assertIn("name:", frontmatter)
            self.assertIn("description:", frontmatter)
            self.assertIn("read-only", text.lower(), skill)

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
