import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Analytics" };

export default function ProviderAnalyticsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Analytics</h1>
        <p className="p-subtitle">Discovery calls, latency, regional spread.</p>
      </div>
      <StubPanel area="Provider analytics" specHref="ai-registry-specs/modules/provider/analytics/product.md" />
    </div>
  );
}
