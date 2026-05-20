// Barrel re-export for @airegistry/public/sections.
//
// Granular subpath imports (@airegistry/public/sections/Hero, etc.) are
// declared in package.json exports and remain the preferred form; this barrel
// is here so consumers that want everything can import { Hero, Faq, ... }
// from "@airegistry/public/sections" if they prefer. `export *` picks up
// every named export (components, types, helpers) from each module.

export * from "./AirIdCopy";
export * from "./ContactContent";
export * from "./DocPage";
export * from "./DocsContent";
export * from "./EcosystemContent";
export * from "./Faq";
export * from "./Faq.client";
export * from "./Globe";
export * from "./GovernancePageContent";
export * from "./GovernanceSection";
export * from "./Hero";
export * from "./HowItWorks";
export * from "./ListingCriteria";
export * from "./MetricsBar";
export * from "./Orchestration";
export * from "./Promo";
export * from "./ProvidersSection";
export * from "./RegistrySection";
export * from "./WhatGetsListed";
