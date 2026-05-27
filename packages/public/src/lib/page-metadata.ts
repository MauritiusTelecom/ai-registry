import type { Metadata } from "next";
import { getBranding } from "@airegistry/core/branding";

/** Page title segment before the registry name, e.g. `Contact · {registryName}`. */
export async function publicPageMetadata(segment: string): Promise<Metadata> {
  const { registryName } = await getBranding();
  return { title: `${segment} · ${registryName}` };
}
