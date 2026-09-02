#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COLLECTION_URL =
  "https://apidocs.talenthr.io/api/collections/32971705/2sBXwmSDRi?segregateAuth=true&versionTag=latest";
const DOCS_URL = "https://apidocs.talenthr.io/";
const BASE_URL = "https://pubapi.talenthr.io/v1";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultOutput = resolve(scriptDirectory, "../api/endpoints.json");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function textValue(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.content === "string") return value.content;
  return "";
}

function plainText(value, maximum = 6_000) {
  return textValue(value)
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function snakeCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function operationName(method, path) {
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith(":")
        ? `by_${snakeCase(segment.slice(1))}`
        : snakeCase(segment),
    );
  return `${method.toLowerCase()}_${segments.filter(Boolean).join("__")}`;
}

function urlDetails(request) {
  const rawUrl =
    typeof request.url === "string"
      ? request.url
      : typeof request.url?.raw === "string"
        ? request.url.raw
        : "";
  if (/^https:\/\//i.test(rawUrl)) {
    const parsed = new URL(rawUrl.replace(/<[^>]+>/g, "placeholder"));
    if (
      parsed.origin !== "https://pubapi.talenthr.io" ||
      !/^\/v1(?:\/|$)/.test(parsed.pathname)
    ) {
      throw new Error(`Refusing non-TalentHR API URL in collection: ${rawUrl}`);
    }
  }

  const candidate = request.urlObject ?? request.url;
  if (candidate && typeof candidate === "object") {
    const pathParts = Array.isArray(candidate.path)
      ? candidate.path.map(String)
      : String(candidate.path ?? "")
          .split("/")
          .filter(Boolean);
    return {
      path: `/${pathParts.join("/")}`,
      query: Array.isArray(candidate.query) ? candidate.query : [],
    };
  }

  const raw = rawUrl;
  if (!raw) throw new Error(`Request ${request.name ?? "<unnamed>"} has no URL`);
  const parsed = new URL(raw.replace(/<[^>]+>/g, "placeholder"));
  const path = parsed.pathname.replace(/^\/v1(?=\/|$)/, "") || "/";
  return {
    path,
    query: [...parsed.searchParams.keys()].map((key) => ({ key })),
  };
}

function collectOperations(items, groups = [], output = []) {
  for (const item of items ?? []) {
    if (item.request) {
      const request = item.request;
      const method = String(request.method ?? "GET").toUpperCase();
      const url = urlDetails(request);
      const query = [];
      const seenQuery = new Set();
      for (const field of url.query) {
        const name = String(field?.key ?? "").trim();
        if (!name || seenQuery.has(name)) continue;
        seenQuery.add(name);
        const description = plainText(field.description, 2_000);
        query.push({
          name,
          description,
          example: field.value == null ? "" : String(field.value),
          required: /(^|[.(\s])required([).\s]|$)/i.test(description),
        });
      }

      const bodyMode = request.body?.mode ?? null;
      const formFields = [];
      for (const field of request.body?.formdata ?? []) {
        const name = String(field?.key ?? "").trim();
        if (!name) continue;
        const description = plainText(field.description, 2_000);
        formFields.push({
          name,
          type: field.type === "file" ? "file" : "text",
          description,
          required: !/(?:\boptional\b|not required)/i.test(description),
        });
      }

      output.push({
        operation: operationName(method, url.path),
        request_id: item.id ?? item._postman_id ?? null,
        category: groups.join(" / ") || "Other",
        name: item.name ?? `${method} ${url.path}`,
        method,
        path: url.path,
        path_params: [...url.path.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)].map(
          (match) => match[1],
        ),
        query,
        body_mode: bodyMode,
        body_example:
          bodyMode === "raw" && typeof request.body.raw === "string"
            ? request.body.raw.trim().slice(0, 12_000)
            : "",
        form_fields: formFields,
        description: plainText(request.description, 6_000),
      });
    } else if (Array.isArray(item.item)) {
      collectOperations(item.item, [...groups, String(item.name ?? "Other")], output);
    }
  }
  return output;
}

async function loadCollection(inputPath) {
  if (inputPath) return JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const response = await fetch(COLLECTION_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(`Collection download failed with HTTP ${response.status}`);
  }
  return response.json();
}

const inputPath = argument("--input");
const outputPath = resolve(argument("--output") ?? defaultOutput);
const collection = await loadCollection(inputPath);
const operations = collectOperations(collection.item);

const operationNames = new Set();
const methodPaths = new Set();
for (const operation of operations) {
  const methodPath = `${operation.method} ${operation.path}`;
  if (methodPaths.has(methodPath)) {
    throw new Error(`Duplicate documented operation: ${methodPath}`);
  }
  methodPaths.add(methodPath);
  if (operationNames.has(operation.operation)) {
    throw new Error(`Duplicate generated identifier: ${operation.operation}`);
  }
  operationNames.add(operation.operation);
}

operations.sort(
  (left, right) =>
    left.category.localeCompare(right.category) ||
    left.path.localeCompare(right.path) ||
    left.method.localeCompare(right.method),
);

const catalogue = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  source: {
    docs_url: DOCS_URL,
    collection_url: COLLECTION_URL,
    collection_id: collection.info?.collectionId ?? collection.info?._postman_id ?? null,
    published_at: collection.info?.publishDate ?? null,
  },
  base_url: BASE_URL,
  operation_count: operations.length,
  operations,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");

const counts = operations.reduce((groups, operation) => {
  (groups[operation.method] ??= []).push(operation);
  return groups;
}, {});
const summary = Object.entries(counts)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([method, entries]) => `${method} ${entries.length}`)
  .join(", ");
process.stdout.write(
  `Generated ${operations.length} TalentHR operations (${summary}) at ${outputPath}\n`,
);
