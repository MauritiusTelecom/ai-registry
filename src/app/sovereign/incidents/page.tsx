import { StubPanel } from "@/components/portals/StubPanel";

export const metadata = { title: "Sovereign · Incidents" };

export default function SovereignIncidentsPage() {
  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Incidents</h1>
        <p className="p-subtitle">National-level incident triage across listed resources.</p>
      </div>
      <StubPanel area="Sovereign incidents" specHref="ai-registry-specs/modules/sovereign/incidents/product.md" />
    </div>
  );
}
