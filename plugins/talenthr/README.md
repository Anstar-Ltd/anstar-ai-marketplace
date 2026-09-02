# TalentHR Codex plugin

This plugin exposes TalentHR's documented public API through a small local Model Context Protocol (MCP) server. It bundles an allow-list generated from TalentHR's official Postman collection and provides three tools:

- search the documented API catalogue;
- run one documented read operation;
- run one documented create, update or delete operation with explicit approval.

The implementation uses Node.js built-ins only and makes requests solely to `https://pubapi.talenthr.io/v1`.

## Configure

1. In TalentHR, open **Settings > Domain settings > API** and generate an API key.
2. Set the key as the `TALENTHR_API_KEY` environment variable available to Codex. Do not commit it or paste it into a prompt.
3. Install the `talenthr` plugin from the Anstar AI marketplace and restart Codex so the MCP process inherits the environment variable.

`TALENTHR_API_PASSWORD` is optional. TalentHR currently ignores the Basic Auth password.

## Develop

```powershell
npm test
npm run update-api
```

The update command downloads the current official public collection and regenerates `api/endpoints.json`. Review catalogue and behavioural changes before release.

See [TalentHR API documentation](https://apidocs.talenthr.io/) for the service contract and `skills/talenthr/references/api-use.md` for tool usage and safety boundaries.
