import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Settings" };

export default function SovereignSettingsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">Operator profile, jurisdiction display name, contacts.</p>
      </div>
      <StubPanel area="Sovereign settings" specHref="ai-registry-specs/modules/sovereign/settings/product.md" />
    </div>
  );
}
