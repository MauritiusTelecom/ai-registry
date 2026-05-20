import { getCurrentUser } from "@airegistry/sdk/server";
import {
  ProviderIncidentsGrid,
  type ProviderIncidentRow
} from "@/components/portals/provider/ProviderIncidentsGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyIncidents } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Incidents" };
export const dynamic = "force-dynamic";

/**
 * Operator-driven enforcement actions targeting this provider's resources
 * or the provider record itself. Scoping invariant:
 *
 *   targetProviderId === user.provider.id
 *   OR targetResource.providerId === user.provider.id
 *
 * Public-safe projection: `internalNote` is NEVER surfaced here. Provider
 * sees the publicNote (operator-curated explanation) and the action type.
 */

export default async function ProviderIncidentsPage() {
  const user = await getCurrentUser();
  const providerId = user?.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Incidents</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const [rows, actionTypes] = await Promise.all([
    loadMyIncidents(providerId),
    listReferenceTable("enforcementType")
  ]);

  const projected: ProviderIncidentRow[] = rows;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Incidents</h1>
        <p className="p-subtitle">
          Operator enforcement actions taken against {user?.provider?.displayName}'s
          resources or provider record. {projected.length} entr
          {projected.length === 1 ? "y" : "ies"} on record.
        </p>
      </div>
      <ProviderIncidentsGrid rows={projected} actionTypes={actionTypes} />
      <p
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "var(--text-3)",
          fontFamily: "IBM Plex Mono, monospace"
        }}
      >
        Internal operator notes are never surfaced here - only the public note attached
        to each action.
      </p>
    </div>
  );
}
