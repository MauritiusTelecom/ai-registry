import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { PageHero } from "@airegistry/ui-kit";
import { RegistrySection } from "../sections/RegistrySection";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Registry");
}

type RegistryKind = "all" | "model" | "agent" | "skill";
const VALID_KINDS: ReadonlySet<RegistryKind> = new Set([
  "all",
  "model",
  "agent",
  "skill"
]);

function normalizeKind(raw: string | undefined): RegistryKind | undefined {
  if (!raw) return undefined;
  const k = raw.trim().toLowerCase();
  return VALID_KINDS.has(k as RegistryKind) ? (k as RegistryKind) : undefined;
}

export default async function RegistryPage({
  searchParams
}: {
  searchParams: Promise<{ provider?: string; kind?: string }>;
}) {
  const [{ provider, kind }, { jurisdictionDisplayName }, t] = await Promise.all([
    searchParams,
    getBranding(),
    getTranslations("registrySection")
  ]);
  const initialKind = normalizeKind(kind);
  return (
    <div>
      <PageHero
        crumb={t("crumb")}
        title={
          <>
            {t.rich("heading", {
              jurisdiction: jurisdictionDisplayName,
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("listPageSubtitle")}
      />
      <RegistrySection
        withHeader={false}
        initialProviderSlug={provider}
        initialKind={initialKind}
      />
    </div>
  );
}
