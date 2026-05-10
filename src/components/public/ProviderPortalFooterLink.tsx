"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { resolveProviderPortalPublicHref } from "@/lib/portals/public-hrefs";

/** Footer "Provider portal" — href depends on session (see `resolveProviderPortalPublicHref`). */
export function ProviderPortalFooterLink() {
  const { user, loading } = useAuth();
  const href = resolveProviderPortalPublicHref(user, loading);
  return <Link href={href}>Provider portal</Link>;
}
