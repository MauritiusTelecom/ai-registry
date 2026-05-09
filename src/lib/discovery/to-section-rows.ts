/**
 * Helper that loads public registry rows from Prisma and returns them in the
 * shape the existing client `RegistrySection` expects. Used by the server
 * pages (`/registry`, `/`) so the section gets real DB data on first paint
 * without a client-side round-trip.
 *
 * Errors fall through to `null` — callers pass `undefined` to the section
 * which then uses its inline mock. This keeps the public surface working
 * even before the Phase 1 seed has been run.
 */

import { listPublicResources } from "./queries";
import type { Resource as SectionResource } from "@/components/public/sections/RegistrySection";

const KINDS = new Set(["model", "agent", "tool", "skill"]);

export async function loadRegistrySectionRows(): Promise<SectionResource[] | null> {
  try {
    const data = await listPublicResources(
      {
        q: null,
        kind: null,
        status: null,
        jurisdictionCode: null,
        providerSlug: null,
        sovereigntyBasisCode: null,
        protocolCode: null,
        languageCode: null
      },
      { limit: 100, cursor: null }
    );
    // The discovery list response carries the public-safe envelope; we need
    // to add a `slug` so `RegistrySection`'s View link can target the detail
    // page. The list response doesn't carry slug today, so use the `airId`
    // tail or the `id` as a fallback. The detail page accepts slug-only.
    return data.rows
      .filter((row) => KINDS.has(row.kind))
      .map((row) => ({
        id: row.id,
        slug: deriveSlugFromAirId(row.airId) ?? row.id,
        kind: row.kind as SectionResource["kind"],
        glyph: row.glyph,
        title: row.title,
        provider: row.provider,
        status: row.status,
        desc: row.desc,
        context: row.context,
        latency: row.latency,
        region: row.region,
        license: row.license,
        tags: row.tags
      }));
  } catch {
    return null;
  }
}

function deriveSlugFromAirId(airId: string | null): string | null {
  if (!airId) return null;
  const parts = airId.split("/");
  return parts[parts.length - 1] ?? null;
}
