"""Exercise a disabled BC plugin through real Codex, without network or credentials.

Requires macOS sandbox-exec for an OS-enforced no-network boundary. This is
validation tooling, not a runtime or employee installation dependency.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
NAME = "anstar-business-central"
PLUGIN_ID = f"{NAME}@anstar-ai"


def validate_staged_marketplace(root: Path) -> dict:
    marketplace = json.loads((root / ".agents/plugins/marketplace.json").read_text())
    entry = next(entry for entry in marketplace["plugins"] if entry["name"] == NAME)
    if entry["policy"]["installation"] != "NOT_AVAILABLE":
        raise ValueError("Smoke requires the staged NOT_AVAILABLE policy")
    data = json.loads((root / f"plugins/{NAME}/.mcp.json").read_text())
    if set(data["mcpServers"]) != {NAME}:
        raise ValueError("Unexpected MCP server in staged BC package")
    server = data["mcpServers"][NAME]
    if server.get("enabled") is not False:
        raise ValueError("Smoke requires a disabled MCP server")
    if server.get("command") or server.get("url") != "https://mcp.businesscentral.dynamics.com":
        raise ValueError("Smoke requires the native Microsoft HTTP endpoint")
    return server


def run_smoke(binary: str) -> dict:
    expected = validate_staged_marketplace(ROOT)
    if sys.platform != "darwin" or not Path("/usr/bin/sandbox-exec").is_file():
        raise RuntimeError("This offline smoke requires macOS sandbox-exec; no unisolated fallback")
    records = []
    with tempfile.TemporaryDirectory(prefix="anstar-bc-smoke-") as directory:
        base = Path(directory).resolve()
        sandbox = base / "offline.sb"
        real_home = Path.home().resolve()
        blocked = " ".join(f"(subpath {json.dumps(str(real_home / p))})" for p in (".codex", ".agents"))
        sandbox.write_text(f"(version 1)\n(allow default)\n(deny network*)\n(deny file-read* file-write* {blocked})\n")

        def environment(label: str) -> dict:
            home = base / label
            for part in (".codex", "cache", "config", "data", "tmp", "work"):
                (home / part).mkdir(parents=True, exist_ok=True)
            (home / ".codex/config.toml").write_text(
                'cli_auth_credentials_store = "file"\n'
                'mcp_oauth_credentials_store = "file"\n'
                '[analytics]\nenabled = false\n'
            )
            # Never inherit provider tokens, service credentials or proxy settings.
            return {
                "HOME": str(home), "CODEX_HOME": str(home / ".codex"),
                "XDG_CACHE_HOME": str(home / "cache"), "XDG_CONFIG_HOME": str(home / "config"),
                "XDG_DATA_HOME": str(home / "data"), "TMPDIR": str(home / "tmp"),
                "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
                "LANG": "en_US.UTF-8", "RUST_LOG": "warn",
            }

        def run(env: dict, args: list[str], *, failure: bool = False) -> Any:
            result = subprocess.run(
                ["/usr/bin/sandbox-exec", "-f", str(sandbox), binary, *args],
                env=env, cwd=Path(env["HOME"]) / "work", capture_output=True,
                text=True, timeout=60,
            )
            records.append({"command": ["codex", *args], "exit_code": result.returncode})
            if failure:
                if result.returncode == 0:
                    raise AssertionError("Staged installation unexpectedly succeeded")
                if "not available" not in (result.stdout + result.stderr).lower():
                    raise AssertionError("Expected policy refusal, got: " + result.stderr)
                return None
            if result.returncode:
                raise RuntimeError(f"{args}: {result.stderr}")
            return json.loads(result.stdout) if "--json" in args else result.stdout.strip()

        held = environment("held")
        version = run(held, ["--version"])
        run(held, ["plugin", "marketplace", "add", str(ROOT), "--json"])
        run(held, ["plugin", "add", PLUGIN_ID, "--json"], failure=True)
        listed = run(held, ["plugin", "list", "--json"])
        if any(p["pluginId"] == PLUGIN_ID for p in listed["installed"]):
            raise AssertionError("Release-held plugin was installed")

        # Alter installation policy only in a disposable marketplace. The actual
        # BC payload and its disabled network transport stay byte-for-byte intact.
        source = base / "marketplace"
        shutil.copytree(ROOT / ".agents/plugins", source / ".agents/plugins")
        shutil.copytree(ROOT / "plugins", source / "plugins")
        market_file = source / ".agents/plugins/marketplace.json"
        market = json.loads(market_file.read_text())
        next(p for p in market["plugins"] if p["name"] == NAME)["policy"]["installation"] = "AVAILABLE"
        market_file.write_text(json.dumps(market, indent=2))
        probe = environment("probe")
        run(probe, ["plugin", "marketplace", "add", str(source), "--json"])
        run(probe, ["plugin", "marketplace", "list", "--json"])
        run(probe, ["plugin", "list", "--available", "--json"])
        installed = run(probe, ["plugin", "add", PLUGIN_ID, "--json"])
        listed = run(probe, ["plugin", "list", "--json"])
        if not any(p["pluginId"] == PLUGIN_ID and p["installed"] for p in listed["installed"]):
            raise AssertionError("Installed plugin not returned in readback")
        destination = Path(installed["installedPath"])
        if not destination.resolve().is_relative_to(Path(probe["CODEX_HOME"]).resolve()):
            raise AssertionError("Install escaped disposable Codex home")
        original = ROOT / f"plugins/{NAME}"
        files = [p for p in original.rglob("*") if p.is_file()]
        for path in files:
            if (destination / path.relative_to(original)).read_bytes() != path.read_bytes():
                raise AssertionError(f"Installed payload differs: {path.relative_to(original)}")
        server = run(probe, ["mcp", "get", NAME, "--json"])
        assert server["enabled"] is False
        assert server["transport"]["type"] == "streamable_http"
        assert server["transport"]["url"] == expected["url"]
        assert server["transport"]["http_headers"] == expected["http_headers"]
        assert server["enabled_tools"] == expected["enabled_tools"]
        assert server["startup_timeout_sec"] == expected["startup_timeout_sec"]
        assert server["tool_timeout_sec"] == expected["tool_timeout_sec"]
        for env in (held, probe):
            for name in ("auth.json", ".credentials.json"):
                if (Path(env["CODEX_HOME"]) / name).exists():
                    raise AssertionError("Unexpected credential artifact")
        return {
            "result": "PASS", "codex_version": version,
            "checks": records, "commands_executed": len(records),
            "payload_files_verified": len(files), "release_hold_enforced": True,
            "mcp_enabled": False, "network": "denied by sandbox-exec",
            "oauth_started": False, "live_bc_reads": 0,
            "user_configuration_modified": False,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-bin", default=shutil.which("codex"))
    args = parser.parse_args()
    if not args.codex_bin:
        parser.error("Codex CLI is required for validation only")
    print(json.dumps(run_smoke(args.codex_bin), indent=2))


if __name__ == "__main__":
    main()
