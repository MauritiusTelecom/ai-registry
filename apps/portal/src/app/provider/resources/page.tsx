import { getCurrentUser } from "@/lib/auth/current-user";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import { prisma } from "@/lib/prisma";
import {
  ProviderResourcesGrid,
  type ProviderResourceRow
} from "@/components/portals/provider/ProviderResourcesGrid";
import { deriveDisplayStatus } from "@airegistry/sdk";

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

  const [rows, kinds, lifecycles] = await Promise.all([
    prisma.resource.findMany({
      where: { providerId },
      include: {
        resourceType: { select: { code: true } },
        lifecycleStatus: true,
        trustSignals: { include: { kind: true, status: true } }
      },
      orderBy: [{ lifecycleStatus: { sortOrder: "asc" } }, { updatedAt: "desc" }]
    }),
    prisma.resourceType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    }),
    prisma.lifecycleStatus.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    })
  ]);

  const projected: ProviderResourceRow[] = rows.map((r) => ({
    id: r.id,
    airId: r.airId,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));

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
