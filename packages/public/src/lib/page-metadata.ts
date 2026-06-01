import type { Metadata } from "next";
import { getBranding } from "@airegistry/core/branding";
import { getTranslations } from "next-intl/server";

/** Localized page title before the registry name, e.g. `Contact · {registryName}`. */
export async function publicPageMetadata(titleKey: string): Promise<Metadata> {
  const [t, { registryName }] = await Promise.all([
    getTranslations("metadata"),
    getBranding()
  ]);
  return { title: `${t(titleKey)} · ${registryName}` };
}
