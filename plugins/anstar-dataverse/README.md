# Anstar Dataverse

This Codex plugin connects to Microsoft's official Dataverse MCP endpoint with a local, read-only adapter. It uses delegated Microsoft device-code sign-in through MSAL because the endpoint's OAuth discovery issuer is incompatible with Codex's direct HTTP OAuth validation. Each employee signs in with their own Anstar account; the plugin contains no shared credential.

On the first Dataverse request, `dv_tools` or `dv_call` returns a Microsoft verification link and one-time code. Codex shows both in chat. The employee opens the link, enters the code and completes Microsoft sign-in, then Codex retries the read. Installing the plugin alone does not open a sign-in page. `dv_connect` can start the same flow explicitly and `dv_status` confirms when it is complete.

The local tools are `dv_status`, `dv_connect`, `dv_tools` and `dv_call`. `dv_tools` returns live schemas for the approved upstream operations: `search`, `search_data`, `describe` and `read_query`. `search_data` is optional if Dataverse Search is disabled. `dv_call` rejects other upstream tool names, oversized arguments and `SELECT *`. The adapter pins the endpoint, restricts HTTP methods and redirects, and accepts text results only. Use the bundled CRM read-safety skill to bound fields and rows. Client filtering does not replace Dataverse roles or field security.

Node.js 22+ with npm/npx is required. First launch installs exact dependencies from `package-lock.json` into a private runtime cache with `npm ci --ignore-scripts`. The guarded MSAL token cache is stored at `~/.local/state/anstar-dataverse/auth/`, outside the plugin and repository. It is plaintext for the signed-in local user, so device encryption and trusted same-user software remain relevant.

Development checks from this directory: `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`. A successful first install also needs a normal employee sign-in and one bounded live read.
