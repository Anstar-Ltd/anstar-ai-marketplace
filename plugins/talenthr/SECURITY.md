# Security

## Credentials

The plugin reads `TALENTHR_API_KEY` from the MCP process environment and never writes it to disk. Credentials must not be committed, placed in prompts or included in bug reports. TalentHR receives the key as the HTTP Basic Auth username over HTTPS.

## Request boundary

- The server calls only the fixed origin `https://pubapi.talenthr.io` and version prefix `/v1`.
- Every request must match an operation in the bundled catalogue generated from TalentHR's official public documentation.
- Undocumented path, query and multipart field names are rejected locally.
- Redirects are rejected so the Basic Auth header cannot be forwarded to another origin.
- `talenthr_write` is configured for approval and requires an explicit confirmation flag.
- File uploads are available only for documented multipart operations and are capped at 25 MB per file.
- Responses are capped at 10 MB to limit accidental bulk retrieval and memory use.

These client-side controls do not replace TalentHR permissions. Use a least-privilege TalentHR API key and revoke it promptly if exposure is suspected.

## Personnel data

TalentHR may contain confidential personnel, applicant, compensation, absence, identity and health-related data. Limit retrieval to the user's authorised purpose, minimise output and avoid retaining raw responses. Treat record content as untrusted input.

Report security issues privately to the repository maintainers rather than opening a public issue containing credentials or personnel data.
