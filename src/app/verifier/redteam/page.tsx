import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Red team" };

export default function VerifierRedteamPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Red team</h1>
        <p className="p-subtitle">Adversarial findings, severity, fix tracking.</p>
      </div>
      <StubPanel area="Red team" specHref="ai-registry-specs/modules/verifier/redteam/product.md" />
    </div>
  );
}
