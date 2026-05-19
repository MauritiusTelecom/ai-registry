import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";

/**
 * GET /api/openapi
 *
 * Phase 5 / T050. Minimal OpenAPI 3.0 document for the public discovery
 * surface plus the most-used authenticated routes. The document is built at
 * request time so the deployment-specific server URL and identity domain are
 * always current; nothing here is user-supplied so caching is safe.
 *
 * The reference repository keeps the source of truth in module-level
 * `api.yaml` files under `ai-registry-specs/modules/**`. This handler ships a
 * runtime-readable subset so MCP/REST clients can negotiate without cloning
 * the spec repo.
 */

export async function GET() {
  const cfg = getConfig();
  const apiBase = cfg.apiBaseUrl.replace(/\/+$/, "");

  const doc = {
    openapi: "3.0.3",
    info: {
      title: `${cfg.registryName} - Public REST`,
      version: "0.4.0",
      description:
        "AIR-SPEC §13 public discovery surface and authenticated provider/admin subsets implemented by this deployment.",
      contact: { name: cfg.operatorName }
    },
    servers: [{ url: apiBase }],
    tags: [
      { name: "Discovery", description: "Public read APIs (no auth)." },
      { name: "Auth", description: "Self-service registration and session." },
      { name: "Provider", description: "Provider authoring (gated)." },
      { name: "Admin", description: "Operator governance." },
      { name: "Health", description: "Liveness probes." }
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Liveness + DB-readiness",
          responses: {
            "200": { description: "ok" },
            "503": { description: "DB unavailable" }
          }
        }
      },
      "/openapi": {
        get: {
          tags: ["Discovery"],
          summary: "This document",
          responses: { "200": { description: "OpenAPI 3.0 JSON" } }
        }
      },
      "/well-known/ai-registry": {
        get: {
          tags: ["Discovery"],
          summary: "Capability document (AIR-SPEC §13)",
          responses: { "200": { description: "WellKnownDocument" } }
        }
      },
      "/resources": {
        get: {
          tags: ["Discovery"],
          summary: "List publicly-listable resources",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            {
              name: "kind",
              in: "query",
              schema: {
                type: "string",
                enum: ["model", "agent", "tool", "skill"]
              }
            },
            { name: "jurisdiction", in: "query", schema: { type: "string" } },
            { name: "provider", in: "query", schema: { type: "string" } },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 }
            },
            { name: "cursor", in: "query", schema: { type: "string" } }
          ],
          responses: { "200": { description: "PublicRegistryListResponse" } }
        }
      },
      "/resources/{type}/{slug}": {
        get: {
          tags: ["Discovery"],
          summary: "Public detail by type + slug",
          parameters: [
            {
              name: "type",
              in: "path",
              required: true,
              schema: {
                type: "string",
                enum: ["model", "agent", "tool", "skill"]
              }
            },
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": { description: "RegistryCardDetail" },
            "404": { description: "Not found" },
            "410": { description: "Removed" }
          }
        }
      },
      "/resolve": {
        get: {
          tags: ["Discovery"],
          summary: "AIR-ID resolve",
          parameters: [
            {
              name: "identity",
              in: "query",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": { description: "RegistryCardDetail" },
            "400": { description: "Malformed AIR-ID" },
            "404": { description: "Not found" },
            "410": { description: "Removed" }
          }
        }
      },
      "/discover": {
        get: {
          tags: ["Discovery"],
          summary: "Capability discovery",
          parameters: [
            {
              name: "capability",
              in: "query",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: { "200": { description: "Resource cards by tag" } }
        }
      },
      "/providers": {
        get: {
          tags: ["Discovery"],
          summary: "Public provider browse",
          responses: { "200": { description: "PublicProvidersListResponse" } }
        }
      },
      "/complaints": {
        post: {
          tags: ["Discovery"],
          summary: "Anonymous complaint intake (PII-minimised)",
          requestBody: { required: true, content: { "application/json": {} } },
          responses: {
            "202": { description: "Recorded" },
            "400": { description: "Invalid input" },
            "404": { description: "Target unresolved" }
          }
        }
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Self-service provider registration",
          responses: { "200": { description: "Session issued" } }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Password login",
          responses: { "200": { description: "Session issued" } }
        }
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current session envelope",
          responses: { "200": { description: "Session user" } }
        }
      },
      "/portal/resources": {
        get: {
          tags: ["Provider"],
          summary: "List my drafts/submissions",
          responses: { "200": { description: "Workspace resources" } }
        },
        post: {
          tags: ["Provider"],
          summary: "Create draft (gated by canAuthorResources)",
          responses: {
            "201": { description: "Created" },
            "403": { description: "Provider not yet allowed to author" }
          }
        }
      },
      "/portal/resources/{id}/submit": {
        post: {
          tags: ["Provider"],
          summary: "Submit draft for review (gated)",
          responses: {
            "200": { description: "Submitted, review opened" },
            "403": { description: "Gate violated" },
            "409": { description: "Lifecycle not draft/needs_update" }
          }
        }
      },
      "/admin/reviews": {
        get: {
          tags: ["Admin"],
          summary: "Review queue (open + in_review)",
          responses: { "200": { description: "Reviews" } }
        }
      },
      "/admin/reviews/{id}/decide": {
        post: {
          tags: ["Admin"],
          summary: "Record review decision (§11 checklist)",
          responses: {
            "200": { description: "Decision recorded" },
            "403": { description: "Separation of duties" }
          }
        }
      },
      "/admin/providers/{id}/verify": {
        post: {
          tags: ["Admin"],
          summary: "Set provider verification status (T035)",
          responses: { "200": { description: "Status updated, audit written" } }
        }
      },
      "/admin/resources/{id}/elevate": {
        post: {
          tags: ["Admin"],
          summary: "Attach official-authority authorisation (T036)",
          responses: {
            "200": { description: "Authorisation + trust signal written" }
          }
        }
      },
      "/mcp": {
        post: {
          tags: ["Discovery"],
          summary: "MCP Streamable HTTP - JSON-RPC 2.0",
          description:
            "Implements `initialize`, `tools/list`, `tools/call`. Tools mirror the public REST surface (registry.list / get / resolve / discover / well_known).",
          responses: { "200": { description: "JSON-RPC response" } }
        }
      }
    }
  };

  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900"
    }
  });
}
