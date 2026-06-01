import { localeRedirect } from "@/i18n/locale-redirect";

// Removed from the provider sidebar - billing is out of MVP scope. Kept as a
// redirect so any bookmarked links land on the provider dashboard instead of
// 404'ing. If billing returns to the spec, replace this file with the real
// page and re-add the nav entry in `src/lib/portals/nav-config.ts`.
export default async function ProviderBillingDeprecated() {
  return await localeRedirect("/provider");
}
