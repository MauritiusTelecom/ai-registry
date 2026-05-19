import { NextResponse } from "next/server";
import { getConfig } from "@airegistry/sdk";
import { prisma } from "@/lib/prisma";
import type { WellKnownDocument } from "@airegistry/sdk";
import { listReferenceTable } from "@airegistry/sdk/server";

/**
 * GET /api/well-known/ai-registry
 *
 * Backed by a rewrite in `next.config.mjs` so the public URL is the AIR-SPEC
 * standard `/.well-known/ai-registry`. Next.js's App Router excludes
 * dot-prefixed folders from routing, so the canonical location is here and
 * the rewrite exposes the conformant URL.
 *
 * AIR-SPEC §13: capability document. Lets a foreign integrator (or an MCP
 * client) auto-configure against this deployment without prior knowledge of
 * its API base or supported resource types.
 */

export async function GET(_req: Request) {
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
      resourceTypes.length > 0 ? resourceTypes.map((r) => r.code) : cfg.resourceTypes,
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

  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      "Content-Language": cfg.defaultLanguage
    }
  });
}
