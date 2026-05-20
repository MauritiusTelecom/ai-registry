import { PageHero } from "@airegistry/ui-kit";
import { ProvidersSection } from "../sections/ProvidersSection";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Providers");
}

export default function ProvidersPage() {
  return (
    <div>
      <PageHero
        crumb="Providers · The organisations behind the registry"
        title={
          <>
            Meet the organisations{" "}
            <span className="gradient-text">Mauritius already trusts</span>.
          </>
        }
        subtitle="Browse the sovereign operators, model labs, hosting partners and accredited integrators behind every listing in the registry. Each provider carries a verifiable status and a public profile."
      />
      <ProvidersSection withHeader={false} />
    </div>
  );
}
