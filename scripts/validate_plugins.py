"""Validate the public Anstar plugin marketplace without external dependencies."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MARKETPLACE_PATH = ROOT / ".agents" / "plugins" / "marketplace.json"
SEMVER = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)
PLUGIN_NAME = re.compile(r"^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$")
REQUIRED_INTERFACE_FIELDS = {
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "category",
    "capabilities",
    "defaultPrompt",
}


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssertionError(f"Cannot read valid JSON from {path}: {exc}") from exc
    assert isinstance(value, dict), f"{path} must contain a JSON object"
    return value


def validate_manifest(plugin_root: Path, expected_name: str) -> None:
    manifest_path = plugin_root / ".codex-plugin" / "plugin.json"
    assert manifest_path.is_file(), f"Missing manifest: {manifest_path}"
    manifest = load_json(manifest_path)

    assert manifest.get("name") == expected_name, f"Manifest name mismatch in {manifest_path}"
    assert PLUGIN_NAME.fullmatch(expected_name), f"Invalid plugin name: {expected_name}"
    assert SEMVER.fullmatch(str(manifest.get("version", ""))), (
        f"Invalid semantic version in {manifest_path}"
    )
    assert str(manifest.get("description", "")).strip(), f"Missing description in {manifest_path}"
    assert str(manifest.get("author", {}).get("name", "")).strip(), (
        f"Missing author name in {manifest_path}"
    )

    interface = manifest.get("interface")
    assert isinstance(interface, dict), f"Missing interface in {manifest_path}"
    missing = REQUIRED_INTERFACE_FIELDS - set(interface)
    assert not missing, f"Missing interface fields in {manifest_path}: {sorted(missing)}"
    prompts = interface["defaultPrompt"]
    assert isinstance(prompts, list), f"defaultPrompt must be an array in {manifest_path}"
    assert 1 <= len(prompts) <= 3, f"defaultPrompt must contain 1-3 prompts in {manifest_path}"
    assert all(isinstance(prompt, str) and 0 < len(prompt) <= 128 for prompt in prompts), (
        f"Invalid default prompt in {manifest_path}"
    )

    for key in ("skills", "mcpServers", "apps"):
        reference = manifest.get(key)
        if isinstance(reference, str):
            assert reference.startswith("./"), f"{key} path must start with ./ in {manifest_path}"
            target = plugin_root / reference
            assert target.exists(), f"Missing {key} target {target}"

    mcp_reference = manifest.get("mcpServers")
    if isinstance(mcp_reference, str):
        mcp_path = plugin_root / mcp_reference
        mcp_config = load_json(mcp_path)
        servers = mcp_config.get("mcpServers")
        assert isinstance(servers, dict) and servers, f"No MCP servers configured in {mcp_path}"
        for server_name, server in servers.items():
            assert isinstance(server, dict), f"Invalid MCP server {server_name} in {mcp_path}"
            if server.get("type") == "http":
                assert str(server.get("url", "")).startswith("https://"), (
                    f"HTTP MCP server {server_name} must use HTTPS"
                )
            else:
                assert str(server.get("command", "")).strip(), (
                    f"Stdio MCP server {server_name} has no command"
                )
                assert isinstance(server.get("args", []), list), (
                    f"Stdio MCP server {server_name} args must be an array"
                )

    rendered = manifest_path.read_text(encoding="utf-8").lower()
    assert "[todo:" not in rendered, f"Unresolved TODO placeholder in {manifest_path}"


def main() -> None:
    marketplace = load_json(MARKETPLACE_PATH)
    assert marketplace.get("name") == "anstar-ai", "Unexpected marketplace name"
    entries = marketplace.get("plugins")
    assert isinstance(entries, list) and entries, "Marketplace contains no plugins"

    names: list[str] = []
    for entry in entries:
        name = entry.get("name")
        assert isinstance(name, str), "Marketplace plugin name is missing"
        names.append(name)
        source = entry.get("source", {})
        assert source.get("source") == "local", f"Unexpected source type for {name}"
        source_path = source.get("path")
        assert isinstance(source_path, str) and source_path == f"./plugins/{name}", (
            f"Unexpected source path for {name}: {source_path}"
        )
        policy = entry.get("policy", {})
        assert policy.get("installation") in {"AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"}, (
            f"Invalid installation policy for {name}"
        )
        assert policy.get("authentication") in {"ON_INSTALL", "ON_USE"}, (
            f"Invalid authentication policy for {name}"
        )
        assert str(entry.get("category", "")).strip(), f"Missing category for {name}"
        validate_manifest(ROOT / "plugins" / name, name)

    assert len(names) == len(set(names)), "Marketplace contains duplicate plugin names"
    print(f"Validated {len(names)} Anstar AI marketplace plugins")


if __name__ == "__main__":
    main()
