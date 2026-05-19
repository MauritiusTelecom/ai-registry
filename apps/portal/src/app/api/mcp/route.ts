import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import {
  findResourceForDetail,
  listPublicResources
} from "@airegistry/sdk";
import { toRegistryCard, toRegistryCardDetail } from "@airegistry/sdk";
import type { ResourceKind, WellKnownDocument } from "@airegistry/sdk";
import { isAirId, parseAirId } from "@airegistry/sdk";
import { listReferenceTable } from "@airegistry/sdk/server";

/**
 * POST /api/mcp - Streamable HTTP MCP adapter (Phase 5 / T052).
 *
 * Implements the JSON-RPC 2.0 surface MCP clients expect over the Streamable
 * HTTP transport: `initialize`, `tools/list`, and `tools/call`. Tools mirror
 * the AIR-SPEC §13 REST discovery surface so an MCP-aware integrator can
 * configure once via `/.well-known/ai-registry` and then call any of:
 *
 *   - registry.list        → GET /api/resources
 *   - registry.get         → GET /api/resources/{type}/{slug}
 *   - registry.resolve     → GET /api/resolve?identity=…
 *   - registry.discover    → GET /api/discover?capability=…
 *   - registry.well_known  → GET /.well-known/ai-registry
 *
 * The reference implementation accepts only the JSON response variant; SSE
 * streaming is documented as future scope (the spec lists T052 as Streamable
 * HTTP delivery and the tools above complete in a single response anyway).
 *
 * Notifications (no `id`) and batches are accepted; both return 202 with no
 * payload, per the JSON-RPC over HTTP convention used by MCP servers.
 */

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_NAME = "airegistry-mcp";
const SERVER_VERSION = "0.4.0";

// ─── Tool catalogue ──────────────────────────────────────────────────────────

type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const TOOLS: ToolDef[] = [
  {
    name: "registry.list",
    description:
      "List publicly-listable resources. Accepts optional `q`, `kind` (model|agent|tool|skill), `jurisdiction`, `provider`, `limit` (1..100, default 20), `cursor`.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        kind: { type: "string", enum: ["model", "agent", "tool", "skill"] },
        jurisdiction: { type: "string" },
        provider: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        cursor: { type: "string" }
      },
      additionalProperties: false
    }
  },
  {
    name: "registry.get",
    description:
      "Fetch one resource detail by slug (and optional type). Returns RegistryCardDetail or an error if the slug is unknown / the resource is not publicly listable.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        type: { type: "string", enum: ["model", "agent", "tool", "skill"] }
      },
      required: ["slug"],
      additionalProperties: false
    }
  },
  {
    name: "registry.resolve",
    description:
      "Resolve an air:// URI to its public-safe RegistryCardDetail.",
    inputSchema: {
      type: "object",
      properties: {
        identity: { type: "string" }
      },
      required: ["identity"],
      additionalProperties: false
    }
  },
  {
    name: "registry.discover",
    description:
      "Find publicly-listable resources whose tags include the given capability (exact-token match, case-insensitive).",
    inputSchema: {
      type: "object",
      properties: {
        capability: { type: "string" }
      },
      required: ["capability"],
      additionalProperties: false
    }
  },
  {
    name: "registry.well_known",
    description:
      "Return this deployment's capability document (registry name, identity domain, jurisdiction, supported types/languages, endpoint templates).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

const KINDS: ResourceKind[] = ["model", "agent", "tool", "skill"];

function pickKind(value: unknown): ResourceKind | null {
  return typeof value === "string" && (KINDS as string[]).includes(value)
    ? (value as ResourceKind)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

async function callTool(
  name: string,
  rawArgs: unknown
): Promise<unknown> {
  const args =
    rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
      ? (rawArgs as Record<string, unknown>)
      : {};

  switch (name) {
    case "registry.list": {
      const limitRaw = typeof args.limit === "number" ? args.limit : 20;
      const limit = Math.min(100, Math.max(1, Math.floor(limitRaw)));
      const data = await listPublicResources(
        {
          q: asString(args.q),
          kind: pickKind(args.kind),
          status: null,
          jurisdictionCode: asString(args.jurisdiction),
          providerSlug: asString(args.provider),
          sovereigntyBasisCode: null,
          protocolCode: null,
          languageCode: null
        },
        { limit, cursor: asString(args.cursor) }
      );
      return data;
    }
    case "registry.get": {
      const slug = asString(args.slug);
      if (!slug) {
        throw mcpInvalidParams("`slug` is required");
      }
      const type = pickKind(args.type);
      const row = await findResourceForDetail({ slug, type: type ?? undefined });
      if (!row) {
        throw mcpAppError(404, `No publicly-listable resource for slug "${slug}".`);
      }
      if (row.lifecycleStatus.code === "removed") {
        throw mcpAppError(410, `Resource "${slug}" was removed.`);
      }
      return toRegistryCardDetail(row);
    }
    case "registry.resolve": {
      const identity = asString(args.identity);
      if (!identity) throw mcpInvalidParams("`identity` is required");
      if (!isAirId(identity)) {
        throw mcpInvalidParams(
          `Malformed AIR-ID; expected air://<domain>/<type>/<provider>/<slug>.`
        );
      }
      const row = await findResourceForDetail({ airId: identity });
      if (!row) {
        throw mcpAppError(404, `No record for ${identity}.`);
      }
      if (row.lifecycleStatus.code === "removed") {
        const parts = parseAirId(identity);
        throw mcpAppError(410, `Resource ${parts?.slug ?? identity} was removed.`);
      }
      return toRegistryCardDetail(row);
    }
    case "registry.discover": {
      const capability = asString(args.capability);
      if (!capability) throw mcpInvalidParams("`capability` is required");
      const tag = capability.toLowerCase();
      // Visibility-rule enforcement (constitution §5) and the include/orderBy
      // shape live in `findResourcesByCapability` now — no raw prisma here.
      const rows = await findResourcesByCapability(tag);
      return {
        capability: tag,
        rows,
        total: rows.length,
        generatedAt: new Date().toISOString()
      };
    }
    case "registry.well_known": {
      const cfg = getConfig();
      const apiBase = cfg.apiBaseUrl.replace(/\/+$/, "");
      const [resourceTypes, languages] = await Promise.all([
        listReferenceTable("resourceType"),
        listReferenceTable("language", { orderBy: "code" })
      ]);
      const doc: WellKnownDocument = {
        registryName: cfg.registryName,
        identityDomain: cfg.identityDomain,
        jurisdiction: cfg.jurisdiction,
        apiBaseUrl: apiBase,
        airSpecVersion: "0.4",
        supportedResourceTypes:
          resourceTypes.length > 0
            ? resourceTypes.map((r) => r.code)
            : cfg.resourceTypes,
        supportedLanguages:
          languages.length > 0 ? languages.map((l) => l.code) : cfg.supportedLanguages,
        defaultLanguage: cfg.defaultLanguage,
        endpoints: {
          list: `${apiBase}/resources`,
          detail: `${apiBase}/resources/{type}/{slug}`,
          resolve: `${apiBase}/resolve?identity=air://${cfg.identityDomain}/{type}/{provider}/{slug}`,
          discover: `${apiBase}/discover?capability={tag}`
        },
        contact: { operatorName: cfg.operatorName },
        generatedAt: new Date().toISOString()
      };
      return doc;
    }
    default:
      throw mcpAppError(404, `Unknown tool "${name}"`);
  }
}

// ─── JSON-RPC plumbing ───────────────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

type JsonRpcError = { code: number; message: string; data?: unknown };

class McpError extends Error {
  code: number;
  data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function mcpInvalidParams(message: string): McpError {
  return new McpError(-32602, message);
}

function mcpAppError(httpStatus: number, message: string): McpError {
  // -32000 is the JSON-RPC application-defined error band.
  return new McpError(-32000, message, { httpStatus });
}

async function handleRpc(req: JsonRpcRequest): Promise<unknown> {
  const { method, params } = req;

  switch (method) {
    case "initialize":
      return {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        capabilities: {
          tools: { listChanged: false }
        }
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      if (!params || typeof params !== "object" || Array.isArray(params)) {
        throw mcpInvalidParams("`params` object required");
      }
      const p = params as Record<string, unknown>;
      const name = typeof p.name === "string" ? p.name : "";
      if (!name) throw mcpInvalidParams("`name` is required");
      const result = await callTool(name, p.arguments);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    }
    case "notifications/initialized":
      // Spec-mandated handshake notification; nothing to do.
      return undefined;
    default:
      throw new McpError(-32601, `Method not found: ${method}`);
  }
}

function buildErrorResponse(id: string | number | null | undefined, e: unknown) {
  let err: JsonRpcError;
  if (e instanceof McpError) {
    err = { code: e.code, message: e.message, data: e.data };
  } else {
    err = {
      code: -32603,
      message: e instanceof Error ? e.message : "Internal error"
    };
  }
  return { jsonrpc: "2.0", id: id ?? null, error: err };
}

function buildSuccessResponse(id: string | number, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

// ─── HTTP entry points ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      buildErrorResponse(null, new McpError(-32700, "Parse error: invalid JSON")),
      { status: 400 }
    );
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return NextResponse.json(
        buildErrorResponse(null, new McpError(-32600, "Empty batch")),
        { status: 400 }
      );
    }
    const out: unknown[] = [];
    for (const m of raw) {
      const resp = await dispatchOne(m);
      if (resp !== null) out.push(resp);
    }
    if (out.length === 0) {
      // pure notification batch
      return new NextResponse(null, { status: 202 });
    }
    return NextResponse.json(out);
  }

  const resp = await dispatchOne(raw);
  if (resp === null) {
    return new NextResponse(null, { status: 202 });
  }
  // Surface application-level HTTP-mapped errors via response status when set.
  const status = httpStatusFromResponse(resp);
  return NextResponse.json(resp, { status });
}

function httpStatusFromResponse(resp: unknown): number {
  if (
    resp &&
    typeof resp === "object" &&
    "error" in (resp as Record<string, unknown>)
  ) {
    const err = (resp as { error: { data?: unknown } }).error;
    if (
      err &&
      err.data &&
      typeof err.data === "object" &&
      "httpStatus" in (err.data as Record<string, unknown>)
    ) {
      const hs = (err.data as { httpStatus?: unknown }).httpStatus;
      if (typeof hs === "number" && hs >= 100 && hs < 600) return hs;
    }
    return 200; // JSON-RPC errors are still HTTP 200 unless app says otherwise.
  }
  return 200;
}

async function dispatchOne(message: unknown): Promise<unknown | null> {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return buildErrorResponse(null, new McpError(-32600, "Invalid Request"));
  }
  const m = message as JsonRpcRequest;
  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") {
    return buildErrorResponse(
      m.id ?? null,
      new McpError(-32600, "Invalid Request: jsonrpc/method")
    );
  }

  const isNotification = m.id === undefined || m.id === null;

  try {
    const result = await handleRpc(m);
    if (isNotification) return null;
    return buildSuccessResponse(m.id as string | number, result);
  } catch (e) {
    if (isNotification) return null;
    return buildErrorResponse(m.id, e);
  }
}

export async function GET() {
  // Streamable HTTP defines an optional GET for server-initiated SSE. The
  // reference deployment does not yet emit server pushes, so we surface a
  // helpful 405 rather than a silent 404. Clients should POST instead.
  return NextResponse.json(
    {
      error:
        "GET /api/mcp is reserved for server-initiated SSE; this deployment accepts POST JSON-RPC only.",
      transports: ["streamable-http(POST,JSON)"],
      protocolVersion: PROTOCOL_VERSION
    },
    { status: 405, headers: { Allow: "POST" } }
  );
}
