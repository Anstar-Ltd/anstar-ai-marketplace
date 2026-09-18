# Third-Party Notices

## Microsoft Business Central hosted MCP

The Anstar Business Central preview connects to Microsoft's hosted Business Central MCP service. No Microsoft server source or third-party community MCP implementation is redistributed. Use of the service remains subject to Microsoft terms and the customer's Business Central entitlements. The Anstar-authored plugin metadata, safety skill and validation tooling follow this repository's `UNLICENSED` package convention. OpenAI Codex CLI 0.146.0 is installed only as a pinned validation dependency; it is not bundled with this plugin.

The local Anstar TypeScript adapter installs these direct runtime packages from npm: Microsoft [`@azure/msal-node@6.0.1`](https://github.com/AzureAD/microsoft-authentication-library-for-js) (MIT), [`@modelcontextprotocol/sdk@1.30.0`](https://github.com/modelcontextprotocol/typescript-sdk) (MIT), [`tsx@4.23.13`](https://github.com/privatenumber/tsx) (MIT) and [`zod@3.25.76`](https://github.com/colinhacks/zod) (MIT). Versions, transitive dependencies, integrity and package license metadata are recorded in the plugin's `package-lock.json`; installed distributions retain their license files. No upstream implementation source was copied into the adapter. Anstar owns maintenance of its adapter and dependency updates. The evaluated `mcp-remote` package is not a dependency and is not shipped.

## OpenAI Role-Specific Sales Plugin

Portions of the Anstar Sales workflow architecture and wording are adapted from the Sales plugin in [`openai/role-specific-plugins`](https://github.com/openai/role-specific-plugins), revision `fe5608d2512a7d6a7b9821ce8a88c48464ecd6e4`. The Anstar adaptation keeps a small subset of workflow concepts, replaces provider placeholders with the existing Anstar Dataverse MCP, and enforces a read-only MVP boundary.

MIT License

Copyright (c) 2026 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
