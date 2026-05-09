import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Provider · Billing" };

export default function ProviderBillingPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Billing</h1>
        <p className="p-subtitle">Statements and invoices (sovereign tiers are non-billed).</p>
      </div>
      <StubPanel area="Provider billing" specHref="ai-registry-specs/modules/provider/billing/product.md" />
    </div>
  );
}
