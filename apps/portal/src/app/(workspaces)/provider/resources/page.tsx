import { getCurrentUser } from "@airegistry/sdk/server";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import {
  ProviderResourcesGrid,
  type ProviderResourceRow
} from "@/components/portals/provider/ProviderResourcesGrid";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadMyResources } from "@airegistry/sdk/server";

export const metadata = { title: "Provider · Resources" };
export const dynamic = "force-dynamic";

export default async function ProviderResourcesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Resources</h1>
          <p className="p-subtitle">
            Your account isn't linked to a provider yet. An operator must associate you with
            a provider before you can publish resources.
          </p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const [projected, kinds, lifecycles] = await Promise.all([
    loadMyResources(providerId),
    listReferenceTable("resourceType"),
    listReferenceTable("lifecycleStatus")
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">My resources</h1>
        <p className="p-subtitle">
          {projected.length} resource{projected.length === 1 ? "" : "s"} under{" "}
          {user?.provider?.displayName ?? "this provider"}.
        </p>
        <div className="p-actions">
          <GatedPublishButton
            href="/provider/publish"
            canAuthorResources={user.canAuthorResources}
            emailVerified={user.emailVerified}
          >
            Publish new resource
          </GatedPublishButton>
        </div>
      </div>
      <ProviderResourcesGrid rows={projected} kinds={kinds} lifecycles={lifecycles} />
    </div>
  );
}
