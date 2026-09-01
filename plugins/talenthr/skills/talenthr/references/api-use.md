# TalentHR API use

## Authentication and base URL

The plugin calls only documented operations below `https://pubapi.talenthr.io/v1`.

TalentHR uses HTTP Basic authentication with the API key as the username. The password is currently ignored by TalentHR; the MCP uses `TALENTHR_API_PASSWORD` when present and otherwise sends a fixed non-secret placeholder. Configure:

- `TALENTHR_API_KEY` (required)
- `TALENTHR_API_PASSWORD` (optional)

Generate the key in TalentHR under **Settings > Domain settings > API**. Do not put credentials in plugin files, prompts, logs or source control.

## Tools

### `talenthr_search_api`

Searches the bundled official-operation catalogue without calling the TalentHR service. Use its returned `operation` value with the read or write tool. Set `include_details` to `true` when query fields, multipart fields or a request-body example are needed.

### `talenthr_read`

Runs one allow-listed `GET` operation. Arguments:

- `operation`: exact operation identifier from API search
- `path_params`: values for colon-prefixed path variables such as `employee`
- `query`: documented query-string fields; arrays create repeated query keys

Each call fetches one API page. TalentHR documents offset/limit pagination, a default limit of 10 and a maximum of 100 for paginated endpoints.

### `talenthr_write`

Runs one allow-listed `POST`, `PUT` or `DELETE` operation. It is configured for explicit client approval and also requires `confirm: true`.

- Use `body` for JSON endpoints.
- Use `form_data` for multipart endpoints.
- A text form field may be a string, number or boolean.
- A file field uses `{ "file_path": "C:\\absolute\\path.pdf", "filename": "optional.pdf", "content_type": "application/pdf" }`.

The server checks that path, query and form-data field names are documented for the selected operation. Local uploads are capped at 25 MB per file.

## Responses and errors

Successful calls return the operation identifier, HTTP status and parsed JSON (or text when the response is not JSON). Non-success responses are returned as MCP tool errors while preserving TalentHR's response body.

Common statuses documented by TalentHR include:

- `401`: missing, malformed or invalid API key
- `403`: missing permission, unauthenticated request or unavailable subscription feature
- `422`: request validation failure
- `429`: rate or usage limit exceeded; the published rate limit is 2,000 requests per minute per API key

Do not automatically repeat a write after an ambiguous network failure or rate-limit response. Read back the relevant record first and ask before retrying if duplication or conflicting state is possible.

## Catalogue freshness

The bundled endpoint catalogue is generated from TalentHR's public Postman collection. Repository maintainers can refresh and validate it with:

```powershell
npm run update-api
npm test
```

Official documentation: <https://apidocs.talenthr.io/>
