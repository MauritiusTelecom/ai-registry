import { notFound } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export const metadata = { title: "Admin · Users & roles" };
export const dynamic = "force-dynamic";

/**
 * Admin · Users - bespoke CRUD grid backed by `/api/admin/users`. Add new
 * opens a modal that issues an invite email; per-row edit / suspend / delete
 * are inline. See `ai-registry-specs/shared/admin-crud.md` §5.3.
 */
export default async function AdminUsersPage() {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();

  const [roles, statuses, providers] = await Promise.all([
    prisma.userRoleType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    }),
    prisma.userStatusType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true }
    }),
    prisma.provider.findMany({
      where: { adminSuspended: false },
      orderBy: { displayName: "asc" },
      select: { slug: true, displayName: true }
    })
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Users &amp; roles</h1>
        <p className="p-subtitle">
          Operators across all four portals. Add new sends a verification / invite email; the
          recipient sets their password via the standard reset flow.
        </p>
      </div>
      <UsersAdmin
        roles={roles}
        statuses={statuses}
        providers={providers}
        selfId={actor.id}
      />
    </div>
  );
}
