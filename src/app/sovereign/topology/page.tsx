import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Topology" };

export default function SovereignTopologyPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Topology</h1>
        <p className="p-subtitle">Dependency graph between sovereign resources.</p>
      </div>
      <StubPanel area="Topology graph" specHref="ai-registry-specs/modules/sovereign/topology/product.md" />
    </div>
  );
}
