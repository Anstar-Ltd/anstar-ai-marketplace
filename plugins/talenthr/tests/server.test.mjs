import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRequestUrl,
  createJsonRpcHandler,
  createRuntime,
  loadCatalogue,
  tools,
} from "../mcp/server.mjs";

const catalogue = await loadCatalogue();

function endpoint(method, path) {
  const match = catalogue.operations.find(
    (operation) => operation.method === method && operation.path === path,
  );
  assert.ok(match, `Missing fixture operation ${method} ${path}`);
  return match;
}

test("catalogue contains the complete unique official operation inventory", () => {
  assert.equal(catalogue.operation_count, 283);
  assert.equal(catalogue.operations.length, 283);
  assert.equal(new Set(catalogue.operations.map((item) => item.operation)).size, 283);
  assert.deepEqual(
    Object.fromEntries(
      ["GET", "POST", "PUT", "DELETE"].map((method) => [
        method,
        catalogue.operations.filter((item) => item.method === method).length,
      ]),
    ),
    { GET: 143, POST: 56, PUT: 49, DELETE: 35 },
  );
});

test("operation identifiers preserve otherwise ambiguous path boundaries", () => {
  assert.equal(endpoint("GET", "/assets-custom-fields").operation, "get_assets_custom_fields");
  assert.equal(endpoint("GET", "/assets/custom-fields").operation, "get_assets__custom_fields");
});

test("buildRequestUrl fills documented path and query fields", () => {
  const operation = endpoint("GET", "/employees/:employee/time-tracking");
  const allowedQuery = operation.query[0]?.name;
  const query = allowedQuery ? { [allowedQuery]: "example" } : {};
  const url = buildRequestUrl(operation, { employee: 42 }, query);
  assert.equal(url.origin, "https://pubapi.talenthr.io");
  assert.equal(url.pathname, "/v1/employees/42/time-tracking");
  if (allowedQuery) assert.equal(url.searchParams.get(allowedQuery), "example");
});

test("buildRequestUrl rejects undocumented and missing parameters", () => {
  const operation = endpoint("GET", "/employees/:employee");
  assert.throws(
    () => buildRequestUrl(operation, {}, {}),
    /Missing path parameter.*employee/,
  );
  assert.throws(
    () => buildRequestUrl(operation, { employee: 1, extra: 2 }, {}),
    /Undocumented path parameter.*extra/,
  );
  assert.throws(
    () => buildRequestUrl(operation, { employee: 1 }, { unexpected: "value" }),
    /Undocumented query parameter.*unexpected/,
  );
});

test("API search returns operation identifiers without making a network request", async () => {
  let fetchCalled = false;
  const runtime = createRuntime({
    catalogue,
    env: {},
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("not expected");
    },
  });
  const result = await runtime.callTool("talenthr_search_api", {
    query: "employee directory",
    method: "GET",
    include_details: true,
  });
  const payload = JSON.parse(result.content[0].text);
  assert.equal(fetchCalled, false);
  assert.ok(payload.results.length > 0);
  assert.ok(payload.results.every((item) => item.method === "GET"));
  assert.ok(payload.results.some((item) => item.path === "/directory"));
});

test("read reports missing credentials without attempting a request", async () => {
  let fetchCalled = false;
  const runtime = createRuntime({
    catalogue,
    env: {},
    fetchImpl: async () => {
      fetchCalled = true;
      throw new Error("not expected");
    },
  });
  const result = await runtime.callTool("talenthr_read", {
    operation: endpoint("GET", "/timezones").operation,
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /TALENTHR_API_KEY is not configured/);
  assert.equal(fetchCalled, false);
});

test("read sends Basic Auth to the fixed TalentHR origin and returns JSON", async () => {
  let captured;
  const runtime = createRuntime({
    catalogue,
    env: { TALENTHR_API_KEY: "test-key", TALENTHR_API_PASSWORD: "test-password" },
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ success: true, data: ["Europe/London"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const result = await runtime.callTool("talenthr_read", {
    operation: endpoint("GET", "/timezones").operation,
  });
  const payload = JSON.parse(result.content[0].text);
  assert.equal(result.isError, undefined);
  assert.equal(captured.url.toString(), "https://pubapi.talenthr.io/v1/timezones");
  assert.equal(captured.options.method, "GET");
  assert.equal(captured.options.redirect, "error");
  assert.equal(
    captured.options.headers.Authorization,
    `Basic ${Buffer.from("test-key:test-password").toString("base64")}`,
  );
  assert.deepEqual(payload.data, { success: true, data: ["Europe/London"] });
});

test("write requires confirmation and serialises a documented JSON body", async () => {
  let captured;
  const runtime = createRuntime({
    catalogue,
    env: { TALENTHR_API_KEY: "test-key" },
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ success: true, data: { id: 42 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const operation = endpoint("POST", "/employees/:employee/terminate");
  const denied = await runtime.callTool("talenthr_write", {
    operation: operation.operation,
    path_params: { employee: 42 },
    body: { effective_date: "2026-09-30" },
  });
  assert.equal(denied.isError, true);
  assert.equal(captured, undefined);

  const accepted = await runtime.callTool("talenthr_write", {
    operation: operation.operation,
    path_params: { employee: 42 },
    body: { effective_date: "2026-09-30" },
    confirm: true,
  });
  assert.equal(accepted.isError, undefined);
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers["Content-Type"], "application/json");
  assert.equal(captured.options.body, '{"effective_date":"2026-09-30"}');
});

test("multipart writes accept documented file fields and reject unknown fields", async () => {
  let captured;
  const runtime = createRuntime({
    catalogue,
    env: { TALENTHR_API_KEY: "test-key" },
    statImpl: async () => ({ isFile: () => true, size: 3 }),
    readFileImpl: async () => Buffer.from("pdf"),
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const operation = endpoint("POST", "/documents/company-documents");
  const rejected = await runtime.callTool("talenthr_write", {
    operation: operation.operation,
    form_data: { undocumented: "value" },
    confirm: true,
  });
  assert.equal(rejected.isError, true);
  assert.match(rejected.content[0].text, /Undocumented multipart field/);

  const accepted = await runtime.callTool("talenthr_write", {
    operation: operation.operation,
    form_data: {
      document: {
        file_path: "C:\\fixtures\\policy.pdf",
        filename: "policy.pdf",
        content_type: "application/pdf",
      },
      folder_id: 12,
    },
    confirm: true,
  });
  assert.equal(accepted.isError, undefined);
  assert.ok(captured.options.body instanceof FormData);
  assert.deepEqual([...captured.options.body.keys()], ["document", "folder_id"]);
});

test("JSON-RPC handler advertises exactly the three bounded tools", async () => {
  const handler = await createJsonRpcHandler({ catalogue, env: {} });
  const initialised = await handler({
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  });
  assert.equal(initialised.serverInfo.name, "talenthr");
  const listed = await handler({ method: "tools/list" });
  assert.deepEqual(
    listed.tools.map((tool) => tool.name),
    ["talenthr_search_api", "talenthr_read", "talenthr_write"],
  );
  assert.equal(tools[2].annotations.destructiveHint, true);
});
