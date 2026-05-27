import { localeRedirect } from "@/i18n/locale-redirect";

// Removed from the provider sidebar - docs surface lives at the public /docs
// route. Kept as a redirect to avoid 404 on bookmarks.
export default async function ProviderDocsDeprecated() {
  return await localeRedirect("/docs");
}
