import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · API keys" };

export default function ProviderKeysPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">API keys</h1>
        <p className="p-subtitle">Provision and rotate keys for endpoint authentication.</p>
      </div>
      <StubPanel area="API keys" specHref="ai-registry-specs/modules/provider/keys/product.md" />
    </div>
  );
}
