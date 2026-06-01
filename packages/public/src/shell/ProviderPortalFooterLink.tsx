"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@airegistry/ui-kit";
import { resolveProviderPortalPublicHref } from "../lib/public-hrefs";

/** Footer "Provider portal" — href depends on session (see `resolveProviderPortalPublicHref`). */
export function ProviderPortalFooterLink() {
  const t = useTranslations("footer");
  const { user, loading } = useAuth();
  const href = resolveProviderPortalPublicHref(user, loading);
  return <Link href={href}>{t("providerPortal")}</Link>;
}
