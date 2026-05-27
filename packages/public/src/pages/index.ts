// Barrel re-export for @airegistry/public/pages.
//
// Granular subpath imports (e.g. @airegistry/public/pages/HomePage) are
// declared in package.json and remain the preferred form — they let Next's
// bundler tree-shake the unused pages out of each route's chunk. This barrel
// is here so the main @airegistry/public entry point can re-export everything
// in one place for callers that want it.
//
// Pages that use `generateMetadata()` (registry-branded titles) export only
// their default component here. Static `metadata` exports remain on auth routes.

export { default as HomePage } from "./HomePage";
export { default as RegistryListPage } from "./RegistryListPage";
export {
  default as RegistryDetailPage,
  metadata as registryDetailMetadata,
  dynamic as registryDetailDynamic
} from "./RegistryDetailPage";
export { default as ProvidersListPage } from "./ProvidersListPage";
export {
  default as ProviderDetailPage,
  dynamic as providerDetailDynamic
} from "./ProviderDetailPage";
export { default as DocsPage } from "./DocsPage";
export { default as EcosystemPage } from "./EcosystemPage";
export { default as GovernancePage } from "./GovernancePage";
export { default as LoginPage, metadata as loginMetadata } from "./LoginPage";
export { default as RegisterPage, metadata as registerMetadata } from "./RegisterPage";
export { default as AuthResetRequestPage, metadata as authResetRequestMetadata } from "./AuthResetRequestPage";
export { default as AuthResetTokenPage, metadata as authResetTokenMetadata } from "./AuthResetTokenPage";
export { default as AuthVerifyPage, metadata as authVerifyMetadata } from "./AuthVerifyPage";
export { default as ContactPage } from "./ContactPage";
export { default as ContactVerifyPage, metadata as contactVerifyMetadata } from "./ContactVerifyPage";
export { default as PricingPage } from "./PricingPage";
export { default as PrivacyPage } from "./PrivacyPage";
export { default as TermsPage } from "./TermsPage";
export { default as AcceptableUsePage } from "./AcceptableUsePage";
export { default as SovereigntyRubricPage } from "./SovereigntyRubricPage";
export { default as VerificationPage } from "./VerificationPage";
export { default as WhitepaperPage } from "./WhitepaperPage";
export { default as OpenDataPage } from "./OpenDataPage";
export { default as AuditLogPage } from "./AuditLogPage";
