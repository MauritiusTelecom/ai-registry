import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Sectors" };

export default function SovereignSectorsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Sectors</h1>
        <p className="p-subtitle">Resource coverage by national sector.</p>
      </div>
      <StubPanel area="Sectors view" specHref="ai-registry-specs/modules/sovereign/sectors/product.md" />
    </div>
  );
}
