import { localeRedirect } from "@/i18n/locale-redirect";

// Removed from the provider sidebar - API key management is out of MVP scope.
// The registry stores endpoint metadata only; key issuance lives at the
// provider's own infrastructure. Redirect bookmarks to the dashboard.
export default async function ProviderKeysDeprecated() {
  return await localeRedirect("/provider");
}
