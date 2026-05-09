import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Verifier · Settings" };

export default function VerifierSettingsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">Reviewer profile, queue preferences.</p>
      </div>
      <StubPanel area="Verifier settings" specHref="ai-registry-specs/modules/verifier/settings/product.md" />
    </div>
  );
}
