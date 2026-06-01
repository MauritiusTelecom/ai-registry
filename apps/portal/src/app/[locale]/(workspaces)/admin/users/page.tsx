import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { listReferenceTable } from "@airegistry/sdk/server";
import { loadActiveProvidersForFilter } from "@airegistry/sdk/server";

export const metadata = { title: "Admin · Users & roles" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();
  const t = await getTranslations("admin.users");

  const [roles, statuses, providers] = await Promise.all([
    listReferenceTable("userRoleType", { orderBy: "name" }),
    listReferenceTable("userStatusType"),
    loadActiveProvidersForFilter()
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
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
