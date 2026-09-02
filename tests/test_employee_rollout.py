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
        self.assertNotIn("--auth-browser", server["args"])
        self.assertNotIn("--login", server["args"])
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
        self.assertEqual(
            manifest["interface"]["defaultPrompt"][0],
            "Connect my Microsoft 365 account using device-code sign-in",
        )

        skill = (
            ROOT
            / "plugins/ms-365-mcp-server/skills/microsoft-365-first/SKILL.md"
        ).read_text(encoding="utf-8").lower()
        for wording in (
            "before opening a browser",
            "mcp__ms365__verify_login",
            "mcp__ms365__login",
            "device_code_required",
            "do not replace this with browser-callback authentication",
            "aadsts50011",
            "do not add `--login`",
            "do not stop at an unauthenticated result",
            "do not report the plugin as connected until that check returns success",
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
        self.assertEqual(github["url"], "https://api.githubcopilot.com/mcp/x/all")
        self.assertEqual(github["default_tools_approval_mode"], "writes")
        self.assertNotIn("command", clickup)
        self.assertNotIn("command", github)

        github_manifest = json.loads(
            (ROOT / "plugins/github/.codex-plugin/plugin.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertIn("Write", github_manifest["interface"]["capabilities"])
        self.assertEqual(github_manifest["skills"], "./skills/")

        github_skill = (
            ROOT / "plugins/github/skills/github-first/SKILL.md"
        ).read_text(encoding="utf-8").lower()
        for wording in (
            "before opening a browser or using github cli",
            "mcp__github__get_me",
            "still exposing the read-only endpoint",
            "search for an existing pull request",
        ):
            self.assertIn(wording, github_skill)

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
            "installing the plugin alone does not open microsoft sign-in",
            "must not describe the connection as ready until verification succeeds",
            "github cli authentication is separate",
            "codex plugin marketplace upgrade anstar-ai",
            "second normal employee account",
            "aadsts50011",
            "device-code sign-in",
        ):
            self.assertIn(wording, guide)


if __name__ == "__main__":
    unittest.main()
