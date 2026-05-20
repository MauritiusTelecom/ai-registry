// Barrel re-export for @airegistry/public/pages.
//
// Granular subpath imports (e.g. @airegistry/public/pages/HomePage) are
// declared in package.json and remain the preferred form — they let Next's
// bundler tree-shake the unused pages out of each route's chunk. This barrel
// is here so the main @airegistry/public entry point can re-export everything
// in one place for callers that want it.
//
// Each module's `default` is the page component; `metadata`, `dynamic`, and
// related route segment config are re-exported as named exports. Two re-export
// styles are used because `export * from` does NOT re-export the `default`
// binding; we list each page explicitly with `default as <Name>` so the
// component is reachable from this barrel under its PageName.

export { default as HomePage } from "./HomePage";
export { default as RegistryListPage, metadata as registryListMetadata } from "./RegistryListPage";
export {
  default as RegistryDetailPage,
  metadata as registryDetailMetadata,
  dynamic as registryDetailDynamic
} from "./RegistryDetailPage";
export { default as ProvidersListPage, metadata as providersListMetadata } from "./ProvidersListPage";
export {
  default as ProviderDetailPage,
  metadata as providerDetailMetadata,
  dynamic as providerDetailDynamic
} from "./ProviderDetailPage";
export { default as DocsPage, metadata as docsMetadata } from "./DocsPage";
export { default as EcosystemPage, metadata as ecosystemMetadata } from "./EcosystemPage";
export { default as GovernancePage, metadata as governanceMetadata } from "./GovernancePage";
export { default as LoginPage, metadata as loginMetadata } from "./LoginPage";
export { default as RegisterPage, metadata as registerMetadata } from "./RegisterPage";
export { default as AuthResetRequestPage, metadata as authResetRequestMetadata } from "./AuthResetRequestPage";
export { default as AuthResetTokenPage, metadata as authResetTokenMetadata } from "./AuthResetTokenPage";
export { default as AuthVerifyPage, metadata as authVerifyMetadata } from "./AuthVerifyPage";
export { default as ContactPage, metadata as contactMetadata } from "./ContactPage";
export { default as ContactVerifyPage, metadata as contactVerifyMetadata } from "./ContactVerifyPage";
export { default as PricingPage, metadata as pricingMetadata } from "./PricingPage";
export { default as PrivacyPage, metadata as privacyMetadata } from "./PrivacyPage";
export { default as TermsPage, metadata as termsMetadata } from "./TermsPage";
export { default as AcceptableUsePage, metadata as acceptableUseMetadata } from "./AcceptableUsePage";
export { default as SovereigntyRubricPage, metadata as sovereigntyRubricMetadata } from "./SovereigntyRubricPage";
export { default as VerificationPage, metadata as verificationMetadata } from "./VerificationPage";
export { default as WhitepaperPage, metadata as whitepaperMetadata } from "./WhitepaperPage";
export { default as OpenDataPage, metadata as openDataMetadata } from "./OpenDataPage";
export { default as AuditLogPage, metadata as auditLogMetadata } from "./AuditLogPage";
