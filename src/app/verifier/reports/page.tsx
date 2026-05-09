import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Reports" };

export default function VerifierReportsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Reports</h1>
        <p className="p-subtitle">Signed verification reports published to providers and admin.</p>
      </div>
      <StubPanel area="Verifier reports" specHref="ai-registry-specs/modules/verifier/reports/product.md" />
    </div>
  );
}
