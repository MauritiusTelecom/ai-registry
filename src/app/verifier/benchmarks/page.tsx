import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Benchmarks" };

export default function VerifierBenchmarksPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Benchmarks</h1>
        <p className="p-subtitle">Sovereign benchmark catalogue — the corpus reviewers use.</p>
      </div>
      <StubPanel area="Benchmarks" specHref="ai-registry-specs/modules/verifier/benchmarks/product.md" />
    </div>
  );
}
