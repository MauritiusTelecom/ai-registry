import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Policies" };

export default function SovereignPoliciesPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Policies</h1>
        <p className="p-subtitle">National policy mappings to AIR-SPEC governance signals.</p>
      </div>
      <StubPanel area="Policies" specHref="ai-registry-specs/modules/sovereign/policies/product.md" />
    </div>
  );
}
