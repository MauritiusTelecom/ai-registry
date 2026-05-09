import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Admin · Settings" };

export default function AdminSettingsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">Deployment-level configuration mirrored from src/lib/config.ts.</p>
      </div>
      <StubPanel
        area="Admin settings"
        specHref="ai-registry-specs/modules/admin/settings/product.md"
      />
    </div>
  );
}
