"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Branding } from "@airegistry/core/branding";

const BrandingContext = createContext<Branding | null>(null);

export function BrandingProvider({
  value,
  children
}: {
  value: Branding;
  children: ReactNode;
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

/** Deployment branding for client sections under the public site shell. */
export function usePublicBranding(): Branding {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("usePublicBranding must be used within BrandingProvider (SiteShell)");
  }
  return ctx;
}
