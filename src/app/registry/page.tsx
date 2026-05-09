import { PageHero } from "@/components/public/sections/PageHero";
import { RegistrySection } from "@/components/public/sections/RegistrySection";
import { loadRegistrySectionRows } from "@/lib/discovery/to-section-rows";

export const metadata = {
  title: "Registry · Sovereign AI Registry"
};

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const rows = await loadRegistrySectionRows();
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
      <RegistrySection withHeader={false} initialResources={rows ?? undefined} />
    </div>
  );
}
