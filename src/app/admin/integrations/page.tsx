import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Admin · Integrations" };

export default function AdminIntegrationsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Integrations</h1>
        <p className="p-subtitle">SSO, SMTP, federation peers, observability sinks.</p>
      </div>
      <StubPanel
        area="Integrations admin"
        specHref="ai-registry-specs/modules/admin/integrations/product.md"
      />
    </div>
  );
}
