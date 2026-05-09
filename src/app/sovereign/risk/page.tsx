import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Risk" };

export default function SovereignRiskPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Risk</h1>
        <p className="p-subtitle">Risk-tier rollup, evidence freshness, control coverage.</p>
      </div>
      <StubPanel area="Risk view" specHref="ai-registry-specs/modules/sovereign/risk/product.md" />
    </div>
  );
}
