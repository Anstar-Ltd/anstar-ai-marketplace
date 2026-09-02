#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "talenthr";
const SERVER_VERSION = "0.1.0";
const BASE_URL = "https://pubapi.talenthr.io/v1";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const cataloguePath = new URL("../api/endpoints.json", import.meta.url);

const scalarValueSchema = {
  type: ["string", "number", "boolean"],
};
const queryValueSchema = {
  oneOf: [
    scalarValueSchema,
    { type: "array", items: scalarValueSchema },
  ],
};

export const tools = [
  {
    name: "talenthr_search_api",
    title: "Search TalentHR API",
    description:
      "Search the bundled catalogue of official TalentHR API operations. Use the returned operation identifier with talenthr_read or talenthr_write.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Words from the intended action, resource, category or endpoint path.",
          default: "",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE"],
          description: "Optional HTTP method filter.",
        },
        category: {
          type: "string",
          description: "Optional exact or partial category filter.",
        },
        include_details: {
          type: "boolean",
          default: false,
          description: "Include descriptions, query fields, form fields and body examples.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 20,
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "talenthr_read",
    title: "Read TalentHR",
    description:
      "Run one documented TalentHR GET operation. The operation, path fields and query fields must exist in the bundled official API catalogue.",
    inputSchema: {
      type: "object",
      required: ["operation"],
      properties: {
        operation: {
          type: "string",
          description: "Exact GET operation identifier returned by talenthr_search_api.",
        },
        path_params: {
          type: "object",
          additionalProperties: scalarValueSchema,
          description: "Values for documented colon-prefixed path variables.",
        },
        query: {
          type: "object",
          additionalProperties: queryValueSchema,
          description: "Documented query fields. Array values create repeated query keys.",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "talenthr_write",
    title: "Change TalentHR",
    description:
      "Run one documented TalentHR POST, PUT or DELETE operation. This changes HR records, requires client approval and requires confirm=true after the exact change has been reviewed.",
    inputSchema: {
      type: "object",
      required: ["operation", "confirm"],
      properties: {
        operation: {
          type: "string",
          description: "Exact POST, PUT or DELETE operation identifier returned by talenthr_search_api.",
        },
        path_params: {
          type: "object",
          additionalProperties: scalarValueSchema,
          description: "Values for documented colon-prefixed path variables.",
        },
        query: {
          type: "object",
          additionalProperties: queryValueSchema,
          description: "Documented query fields.",
        },
        body: {
          description: "JSON request body for a documented raw-JSON operation.",
        },
        form_data: {
          type: "object",
          description:
            "Fields for a documented multipart operation. File values use file_path, with optional filename and content_type.",
          additionalProperties: true,
        },
        confirm: {
          type: "boolean",
          const: true,
          description: "Must be true only after the exact TalentHR change has been reviewed.",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];

export async function loadCatalogue() {
  const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
  if (catalogue.base_url !== BASE_URL) {
    throw new Error(`Catalogue base URL is not permitted: ${catalogue.base_url}`);
  }
  if (!Array.isArray(catalogue.operations) || catalogue.operations.length === 0) {
    throw new Error("TalentHR API catalogue is empty or invalid");
  }
  return catalogue;
}

function normaliseScalar(value, fieldName) {
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  throw new Error(`${fieldName} must be a string, number or boolean`);
}

export function buildRequestUrl(endpoint, pathParams = {}, query = {}) {
  const documentedPathParams = new Set(endpoint.path_params ?? []);
  const providedPathParams = Object.keys(pathParams ?? {});
  for (const name of providedPathParams) {
    if (!documentedPathParams.has(name)) {
      throw new Error(`Undocumented path parameter for ${endpoint.operation}: ${name}`);
    }
  }

  let path = endpoint.path;
  for (const name of documentedPathParams) {
    const value = pathParams?.[name];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter for ${endpoint.operation}: ${name}`);
    }
    path = path.replaceAll(`:${name}`, encodeURIComponent(normaliseScalar(value, name)));
  }
  if (/:([A-Za-z_][A-Za-z0-9_]*)/.test(path)) {
    throw new Error(`Unresolved path parameter in ${endpoint.operation}`);
  }

  const documentedQuery = new Set((endpoint.query ?? []).map((field) => field.name));
  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, rawValue] of Object.entries(query ?? {})) {
    if (!documentedQuery.has(name)) {
      throw new Error(`Undocumented query parameter for ${endpoint.operation}: ${name}`);
    }
    if (rawValue === undefined || rawValue === null) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      url.searchParams.append(name, normaliseScalar(value, name));
    }
  }
  return url;
}

function searchableText(operation) {
  return [
    operation.operation,
    operation.name,
    operation.category,
    operation.method,
    operation.path,
    operation.description,
  ]
    .join(" ")
    .toLowerCase();
}

function searchScore(operation, query) {
  if (!query) return 1;
  const lowerQuery = query.toLowerCase().trim();
  const haystack = searchableText(operation);
  const tokens = lowerQuery.split(/\s+/).filter(Boolean);
  if (!tokens.every((token) => haystack.includes(token))) return -1;
  let score = tokens.length;
  if (operation.operation === lowerQuery) score += 100;
  if (operation.operation.includes(lowerQuery)) score += 30;
  if (operation.name.toLowerCase().includes(lowerQuery)) score += 20;
  if (operation.path.toLowerCase().includes(lowerQuery)) score += 10;
  return score;
}

function publicOperation(operation, includeDetails) {
  const result = {
    operation: operation.operation,
    method: operation.method,
    category: operation.category,
    name: operation.name,
    path: operation.path,
    path_params: operation.path_params,
    body_mode: operation.body_mode,
  };
  if (includeDetails) {
    result.description = operation.description;
    result.query = operation.query;
    result.form_fields = operation.form_fields;
    result.body_example = operation.body_example;
  }
  return result;
}

function textResult(value, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

async function appendFormValue(form, name, value, dependencies) {
  if (Array.isArray(value)) {
    for (const item of value) await appendFormValue(form, name, item, dependencies);
    return;
  }
  if (value && typeof value === "object" && "file_path" in value) {
    const filePath = String(value.file_path);
    if (!isAbsolute(filePath)) throw new Error(`Upload path must be absolute: ${filePath}`);
    const fileStats = await dependencies.statImpl(filePath);
    if (!fileStats.isFile()) throw new Error(`Upload path is not a file: ${filePath}`);
    if (fileStats.size > MAX_UPLOAD_BYTES) {
      throw new Error(`Upload exceeds the 25 MB limit: ${filePath}`);
    }
    const bytes = await dependencies.readFileImpl(filePath);
    const filename = value.filename ? String(value.filename) : filePath.split(/[\\/]/).at(-1);
    const contentType = value.content_type
      ? String(value.content_type)
      : "application/octet-stream";
    form.append(name, new Blob([bytes], { type: contentType }), filename);
    return;
  }
  form.append(name, normaliseScalar(value, name));
}

async function prepareBody(endpoint, args, dependencies) {
  if (endpoint.body_mode === "formdata") {
    if (args.body !== undefined) {
      throw new Error(`${endpoint.operation} expects form_data, not body`);
    }
    const formData = args.form_data ?? {};
    const allowedFields = new Set((endpoint.form_fields ?? []).map((field) => field.name));
    for (const name of Object.keys(formData)) {
      if (!allowedFields.has(name)) {
        throw new Error(`Undocumented multipart field for ${endpoint.operation}: ${name}`);
      }
    }
    const form = new FormData();
    for (const [name, value] of Object.entries(formData)) {
      await appendFormValue(form, name, value, dependencies);
    }
    return { body: form, headers: {} };
  }

  if (args.form_data !== undefined) {
    throw new Error(`${endpoint.operation} does not accept form_data`);
  }
  if (args.body === undefined) return { body: undefined, headers: {} };
  if (endpoint.body_mode !== "raw") {
    throw new Error(`${endpoint.operation} has no documented JSON request body`);
  }
  return {
    body: typeof args.body === "string" ? args.body : JSON.stringify(args.body),
    headers: { "Content-Type": "application/json" },
  };
}

function safeHeaders(headers) {
  const output = {};
  for (const name of ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining"]) {
    const value = headers.get(name);
    if (value !== null) output[name] = value;
  }
  return output;
}

async function readResponseText(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("TalentHR response exceeds the 10 MB safety limit");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("TalentHR response exceeds the 10 MB safety limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createRuntime({
  catalogue,
  env = process.env,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  statImpl = stat,
} = {}) {
  if (!catalogue) throw new Error("A TalentHR catalogue is required");
  const operations = new Map(
    catalogue.operations.map((operation) => [operation.operation, operation]),
  );
  const dependencies = { readFileImpl, statImpl };

  async function callApi(endpoint, args) {
    const apiKey = String(env.TALENTHR_API_KEY ?? "").trim();
    if (!apiKey) {
      throw new Error(
        "TALENTHR_API_KEY is not configured. Generate a key in TalentHR Settings > Domain settings > API, expose it to Codex, then restart Codex.",
      );
    }

    const url = buildRequestUrl(endpoint, args.path_params, args.query);
    const prepared = await prepareBody(endpoint, args, dependencies);
    const password = String(env.TALENTHR_API_PASSWORD ?? "codex");
    const authorization = Buffer.from(`${apiKey}:${password}`, "utf8").toString("base64");
    const response = await fetchImpl(url, {
      method: endpoint.method,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authorization}`,
        "User-Agent": `anstar-talenthr-codex-plugin/${SERVER_VERSION}`,
        ...prepared.headers,
      },
      body: prepared.body,
      redirect: "error",
      signal: AbortSignal.timeout(110_000),
    });

    const responseText = await readResponseText(response);
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
    }
    const result = {
      operation: endpoint.operation,
      method: endpoint.method,
      path: endpoint.path,
      status: response.status,
      ok: response.ok,
      headers: safeHeaders(response.headers),
      data,
    };
    return textResult(result, !response.ok);
  }

  return {
    async callTool(name, args = {}) {
      if (name === "talenthr_search_api") {
        const query = String(args.query ?? "").trim();
        const method = args.method ? String(args.method).toUpperCase() : null;
        const category = String(args.category ?? "").trim().toLowerCase();
        const limit = Math.min(50, Math.max(1, Number(args.limit ?? 20)));
        const matches = catalogue.operations
          .filter((operation) => !method || operation.method === method)
          .filter(
            (operation) => !category || operation.category.toLowerCase().includes(category),
          )
          .map((operation) => ({ operation, score: searchScore(operation, query) }))
          .filter((entry) => entry.score >= 0)
          .sort(
            (left, right) =>
              right.score - left.score ||
              left.operation.operation.localeCompare(right.operation.operation),
          )
          .slice(0, limit)
          .map((entry) => publicOperation(entry.operation, args.include_details === true));
        return textResult({
          source: catalogue.source,
          total_operations: catalogue.operation_count,
          returned: matches.length,
          results: matches,
        });
      }

      if (name !== "talenthr_read" && name !== "talenthr_write") {
        return textResult({ error: `Unknown tool: ${name}` }, true);
      }
      const endpoint = operations.get(String(args.operation ?? ""));
      if (!endpoint) {
        return textResult(
          { error: "Unknown operation. Search with talenthr_search_api first." },
          true,
        );
      }
      if (name === "talenthr_read" && endpoint.method !== "GET") {
        return textResult(
          { error: `${endpoint.operation} is ${endpoint.method}; use talenthr_write.` },
          true,
        );
      }
      if (name === "talenthr_write" && endpoint.method === "GET") {
        return textResult(
          { error: `${endpoint.operation} is GET; use talenthr_read.` },
          true,
        );
      }
      if (name === "talenthr_write" && args.confirm !== true) {
        return textResult(
          { error: "TalentHR writes require confirm=true after reviewing the exact change." },
          true,
        );
      }
      try {
        return await callApi(endpoint, args);
      } catch (error) {
        return textResult(
          { error: error instanceof Error ? error.message : "TalentHR request failed" },
          true,
        );
      }
    },
  };
}

export async function createJsonRpcHandler(options = {}) {
  const catalogue = options.catalogue ?? (await loadCatalogue());
  const runtime = createRuntime({ ...options, catalogue });
  return async function handle(message) {
    if (message.method === "initialize") {
      return {
        protocolVersion: message.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      };
    }
    if (message.method === "ping") return {};
    if (message.method === "tools/list") return { tools };
    if (message.method === "tools/call") {
      return runtime.callTool(message.params?.name, message.params?.arguments ?? {});
    }
    if (message.method?.startsWith("notifications/")) return undefined;
    const error = new Error(`Method not found: ${message.method}`);
    error.code = -32601;
    throw error;
  };
}

export async function startStdio() {
  const handle = await createJsonRpcHandler();
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })}\n`,
      );
      continue;
    }
    if (message.id === undefined) {
      try {
        await handle(message);
      } catch {
        // Notifications do not receive error responses.
      }
      continue;
    }
    try {
      const result = await handle(message);
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n`);
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: Number.isInteger(error?.code) ? error.code : -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
        })}\n`,
      );
    }
  }
}

const directPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (directPath === resolve(fileURLToPath(import.meta.url))) {
  startStdio().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
