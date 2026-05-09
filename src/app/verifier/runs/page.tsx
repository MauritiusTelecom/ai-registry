import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Eval runs" };

export default function VerifierRunsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Eval runs</h1>
        <p className="p-subtitle">Past evaluation runs against listed resources.</p>
      </div>
      <StubPanel area="Eval runs" specHref="ai-registry-specs/modules/verifier/runs/product.md" />
    </div>
  );
}
