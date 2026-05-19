import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ProvidersAdmin } from "@/components/admin/ProvidersAdmin";

export const metadata = { title: "Admin · Providers" };
export const dynamic = "force-dynamic";

/**
 * Admin · Providers - bespoke CRUD grid backed by `/api/admin/providers`.
 * Add new opens a modal that creates an `operator_added` provider in
 * `unverified` status; per-row Verify routes to the existing
 * `/admin/providers/[id]` page (which holds the verification form).
 *
 * See `ai-registry-specs/shared/admin-crud.md` §5.2.
 */
export default async function AdminProvidersPage() {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();

  const [types, statuses, jurisdictions] = await Promise.all([
    prisma.providerTypeRef.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    }),
    prisma.providerStatusType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    }),
    prisma.jurisdiction.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    })
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Providers</h1>
        <p className="p-subtitle">
          Sovereign, regional, private, and external operators. Add new starts an{" "}
          <code>operator_added</code> record in <code>unverified</code> status - verification
          remains a separate decision (per-row Verify).
        </p>
      </div>
      <ProvidersAdmin types={types} statuses={statuses} jurisdictions={jurisdictions} />
    </div>
  );
}
