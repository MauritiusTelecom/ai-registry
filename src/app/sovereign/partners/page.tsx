import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Partners" };

export default function SovereignPartnersPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Partners</h1>
        <p className="p-subtitle">Hosting, identity, integration partners onboarded for this jurisdiction.</p>
      </div>
      <StubPanel area="Partners" specHref="ai-registry-specs/modules/sovereign/partners/product.md" />
    </div>
  );
}
