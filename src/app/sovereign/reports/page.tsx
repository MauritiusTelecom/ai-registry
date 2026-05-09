import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Reports" };

export default function SovereignReportsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reports</h1>
        <p className="p-subtitle">Quarterly registry reports for the operator and government.</p>
      </div>
      <StubPanel area="Sovereign reports" specHref="ai-registry-specs/modules/sovereign/reports/product.md" />
    </div>
  );
}
