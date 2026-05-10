import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ResourcesAdmin } from "@/components/admin/ResourcesAdmin";

export const metadata = { title: "Admin · Resources" };
export const dynamic = "force-dynamic";

/**
 * Admin · Resources — bespoke CRUD grid backed by `/api/admin/resources`.
 * Add new opens a modal that creates a draft; per-row Approve / Reject /
 * Suspend / Restore / Deprecate / Remove route through
 * `/api/admin/resources/:id/transition`. The §11 sovereignty checklist
 * remains required in the proper review path at `/admin/reviews`.
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.1.
 */
export default async function AdminResourcesPage() {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();

  const [kinds, lifecycles, providers, jurisdictions, riskLevels] = await Promise.all([
    prisma.resourceType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    }),
    prisma.lifecycleStatus.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    }),
    prisma.provider.findMany({
      where: { adminSuspended: false },
      orderBy: { displayName: "asc" },
      select: { slug: true, displayName: true }
    }),
    prisma.jurisdiction.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    }),
    prisma.riskLevel.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    })
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Resources</h1>
        <p className="p-subtitle">
          Models, agents, tools and skills across every publisher. Add new creates a{" "}
          <code>draft</code> on behalf of an existing provider; lifecycle transitions live on the
          per-row action menu.
        </p>
      </div>
      <ResourcesAdmin
        kinds={kinds}
        lifecycles={lifecycles}
        providers={providers}
        jurisdictions={jurisdictions}
        riskLevels={riskLevels}
      />
    </div>
  );
}
