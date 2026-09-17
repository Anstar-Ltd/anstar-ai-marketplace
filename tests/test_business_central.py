"""Offline contracts for the staged first-party Business Central plugin."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins/anstar-business-central"


class BusinessCentralContractTests(unittest.TestCase):
    def test_smoke_refuses_to_launch_with_an_enabled_server(self):
        self.assertTrue((ROOT / "scripts/smoke_business_central.py").is_file())
        from scripts.smoke_business_central import validate_staged_marketplace

        self.assertIs(validate_staged_marketplace(ROOT)["enabled"], False)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / ".agents", root / ".agents")
            shutil.copytree(PLUGIN, root / "plugins/anstar-business-central")
            path = root / "plugins/anstar-business-central/.mcp.json"
            data = json.loads(path.read_text())
            data["mcpServers"]["anstar-business-central"]["enabled"] = True
            path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "disabled"):
                validate_staged_marketplace(root)

    def test_staged_plugin_is_discoverable_but_cannot_connect(self):
        marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
        entries = {entry["name"]: entry for entry in marketplace["plugins"]}
        self.assertIn("anstar-business-central", entries)
        self.assertEqual(entries["anstar-business-central"]["policy"]["installation"], "NOT_AVAILABLE")
        manifest = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text())
        self.assertEqual(manifest["interface"]["capabilities"], ["Read"])
        self.assertEqual(manifest["mcpServers"], "./.mcp.json")
        server = json.loads((PLUGIN / ".mcp.json").read_text())["mcpServers"]["anstar-business-central"]
        self.assertIs(server["enabled"], False)
        self.assertEqual(server["oauth"], {
            "client_id": "894473ac-0b35-44de-97f8-c642366fdb43",
        })
        self.assertEqual(server["type"], "http")
        self.assertEqual(server["url"], "https://mcp.businesscentral.dynamics.com")
        self.assertNotIn("command", server)
        self.assertNotIn("env_http_headers", server, "Employees must not configure environment variables")
        self.assertEqual(server["http_headers"]["EnvironmentName"], "sandbox-uat-2026-march")
        self.assertEqual(server["http_headers"]["ConfigurationName"], "Anstar AI Read Only")
        self.assertEqual(set(server["enabled_tools"]), {
            "bc_actions_search", "bc_actions_describe", "bc_actions_invoke",
        })
        self.assertEqual(server["default_tools_approval_mode"], "approve")
        self.assertEqual(server["scopes"], [
            "offline_access", "https://mcp.businesscentral.dynamics.com/Financials.ReadWrite.All",
        ])


if __name__ == "__main__":
    unittest.main()
