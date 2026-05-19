import { getCurrentUser } from "@/lib/auth/current-user";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";
import { prisma } from "@/lib/prisma";
import {
  ProviderSubmissionsGrid,
  type ProviderSubmissionRow
} from "@/components/portals/provider/ProviderSubmissionsGrid";
import { deriveDisplayStatus } from "@airegistry/sdk";

export const metadata = { title: "Provider · Submissions" };
export const dynamic = "force-dynamic";

/**
 * Submissions = my resources whose lifecycle is one of
 * { draft, submitted, in_review, needs_update } - i.e. anything that hasn't
 * yet reached `listed`. This is the provider's view of "what's still in
 * flight".
 */

const PRE_LISTED = ["draft", "submitted", "in_review", "needs_update"] as const;

export default async function ProviderSubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const providerId = user.provider?.id ?? null;

  if (!providerId) {
    return (
      <div className="p-content">
        <div className="p-page-header">
          <h1 className="p-title">Submissions</h1>
          <p className="p-subtitle">Your account isn't linked to a provider yet.</p>
        </div>
        <div className="p-empty">
          <div className="p-empty-text">No provider linkage on this account.</div>
        </div>
      </div>
    );
  }

  const [rows, kinds, lifecycles] = await Promise.all([
    prisma.resource.findMany({
      where: {
        providerId,
        lifecycleStatus: { code: { in: [...PRE_LISTED] } }
      },
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
      where: { active: true, code: { in: [...PRE_LISTED] } },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    })
  ]);

  const projected: ProviderSubmissionRow[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.resourceType.code,
    lifecycle: r.lifecycleStatus.name,
    lifecycleCode: r.lifecycleStatus.code,
    status: deriveDisplayStatus({
      ...r,
      lifecycleStatus: r.lifecycleStatus,
      trustSignals: r.trustSignals
    }),
    submittedAt: r.submittedAt ? r.submittedAt.toISOString().slice(0, 10) : null,
    updatedAt: r.updatedAt.toISOString().slice(0, 10)
  }));

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Submissions</h1>
        <p className="p-subtitle">
          {projected.length} resource{projected.length === 1 ? "" : "s"} not yet listed -
          drafts, in-review, or needs-update.
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
      <ProviderSubmissionsGrid rows={projected} kinds={kinds} lifecycles={lifecycles} />
    </div>
  );
}
