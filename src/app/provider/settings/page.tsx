import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Settings" };

export default function ProviderSettingsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">Profile, contacts, default jurisdiction, notification preferences.</p>
      </div>
      <StubPanel area="Provider settings" specHref="ai-registry-specs/modules/provider/settings/product.md" />
    </div>
  );
}
