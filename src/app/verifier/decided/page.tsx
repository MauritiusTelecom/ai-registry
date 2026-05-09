import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Decided" };

export default function VerifierDecidedPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Decided</h1>
        <p className="p-subtitle">Reviews you've completed, with checklist outcomes.</p>
      </div>
      <StubPanel area="Decided reviews" specHref="ai-registry-specs/modules/verifier/decided/product.md" />
    </div>
  );
}
