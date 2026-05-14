import { PageHero } from "@/components/public/sections/PageHero";
import { RegistrySection } from "@/components/public/sections/RegistrySection";

export const metadata = {
  title: "Registry · Mauritius AI Registry"
};

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
  const { provider, kind } = await searchParams;
  const initialKind = normalizeKind(kind);
  return (
    <div>
      <PageHero
        crumb="Registry · Discover sovereign AI"
        title={
          <>
            Discover what Mauritius can{" "}
            <span className="gradient-text">trust and integrate</span>.
          </>
        }
        subtitle="Browse public listings and filter by kind. Listings carry verifiable providers and stable AIR-IDs."
      />
      <RegistrySection
        withHeader={false}
        initialProviderSlug={provider}
        initialKind={initialKind}
      />
    </div>
  );
}
