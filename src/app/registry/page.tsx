import { PageHero } from "@/components/public/sections/PageHero";
import { RegistrySection } from "@/components/public/sections/RegistrySection";

export const metadata = {
  title: "Registry · Mauritius AI Registry"
};

export default async function RegistryPage({
  searchParams
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  return (
    <div>
      <PageHero
        crumb="Registry · Discover sovereign AI"
        title={
          <>
            Discover what your nation can{" "}
            <span className="gradient-text">trust and integrate</span>.
          </>
        }
        subtitle="Browse models, agents, MCP skills and tools. Filter by status, kind or jurisdiction. Listings carry verifiable providers and stable AIR-IDs."
      />
      <RegistrySection withHeader={false} initialProviderSlug={provider} />
    </div>
  );
}
