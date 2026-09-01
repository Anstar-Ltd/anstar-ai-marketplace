import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class EmployeeRolloutTests(unittest.TestCase):
    def load_server(self, plugin: str, server: str):
        path = ROOT / "plugins" / plugin / ".mcp.json"
        return json.loads(path.read_text(encoding="utf-8"))["mcpServers"][server]

    def test_softeria_uses_working_windows_delegated_organisation_mode(self):
        server = self.load_server("ms-365-mcp-server", "ms365")
        self.assertEqual(server["command"], "cmd")
        self.assertEqual(
            server["args"][:4],
            ["/c", "npx", "-y", "@softeria/ms-365-mcp-server@0.148.2"],
        )
        self.assertIn("--org-mode", server["args"])
        self.assertNotIn("--read-only", server["args"])
        self.assertNotIn("env", server)
        self.assertNotIn("env_vars", server)

        manifest = json.loads(
            (ROOT / "plugins/ms-365-mcp-server/.codex-plugin/plugin.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertIn("Write", manifest["interface"]["capabilities"])
        self.assertIn("delegated", manifest["interface"]["longDescription"].lower())
        self.assertEqual(manifest["skills"], "./skills/")

        skill = (
            ROOT
            / "plugins/ms-365-mcp-server/skills/microsoft-365-first/SKILL.md"
        ).read_text(encoding="utf-8").lower()
        for wording in (
            "before opening a browser",
            "mcp__ms365__verify_login",
            "mcp__ms365__list_accounts",
            "teams and sharepoint require softeria organisation mode",
            "availability, authentication, permission or capability limitation",
        ):
            self.assertIn(wording, skill)

    def test_plaud_uses_portable_pinned_package(self):
        server = self.load_server("plaud", "plaud")
        self.assertEqual(server["command"], "npx")
        self.assertEqual(server["args"], ["-y", "@plaud-ai/mcp@0.3.10"])

    def test_hosted_mcp_endpoints_remain_bounded(self):
        clickup = self.load_server("clickup", "clickup")
        github = self.load_server("github", "github")
        self.assertEqual(clickup["url"], "https://mcp.clickup.com/mcp")
        self.assertEqual(github["url"], "https://api.githubcopilot.com/mcp/x/all/readonly")
        self.assertNotIn("command", clickup)
        self.assertNotIn("command", github)

        clickup_manifest = json.loads(
            (ROOT / "plugins/clickup/.codex-plugin/plugin.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(clickup_manifest["apps"], "./.app.json")
        self.assertNotIn("mcpServers", clickup_manifest)
        clickup_app = json.loads(
            (ROOT / "plugins/clickup/.app.json").read_text(encoding="utf-8")
        )["apps"]["clickup"]
        self.assertEqual(
            clickup_app["id"],
            "asdk_app_69431e6d26b88191b4029488aeb42f5b",
        )
        self.assertTrue(clickup_app["required"])

    def test_employee_guide_documents_identity_and_update_boundaries(self):
        guide = (ROOT / "docs/INSTALL-FOR-EVERYONE.md").read_text(encoding="utf-8").lower()
        for wording in (
            "delegated microsoft authentication",
            "cannot grant access",
            "administrator consent",
            "github cli authentication is separate",
            "codex plugin marketplace upgrade anstar-ai",
            "second normal employee account",
        ):
            self.assertIn(wording, guide)


if __name__ == "__main__":
    unittest.main()
