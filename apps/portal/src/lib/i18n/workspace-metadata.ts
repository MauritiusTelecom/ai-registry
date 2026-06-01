import { getTranslations } from "next-intl/server";

/** Localized document title for workspace portal routes. */
export async function workspaceMetadata(key: string) {
  const t = await getTranslations("metadata");
  return { title: t(key) };
}
