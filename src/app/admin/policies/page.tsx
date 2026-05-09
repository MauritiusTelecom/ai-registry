import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Admin · Policies" };

export default function AdminPoliciesPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Policies</h1>
        <p className="p-subtitle">Lifecycle and trust-signal policies that shape the registry.</p>
      </div>
      <StubPanel
        area="Policies admin"
        specHref="ai-registry-specs/modules/admin/policies/product.md"
      />
    </div>
  );
}
