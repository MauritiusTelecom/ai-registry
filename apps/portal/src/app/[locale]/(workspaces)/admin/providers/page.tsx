import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ProvidersAdmin } from "@/components/admin/ProvidersAdmin";
import { listReferenceTable } from "@airegistry/sdk/server";

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
  const t = await getTranslations("admin.providers");
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("admin")) notFound();

  const [types, statuses, jurisdictions] = await Promise.all([
    listReferenceTable("providerTypeRef", { orderBy: "name" }),
    listReferenceTable("providerStatusType"),
    listReferenceTable("jurisdiction", { orderBy: "name" })
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("title")}</h1>
        <p className="p-subtitle">{t("subtitle")}</p>
      </div>
      <ProvidersAdmin types={types} statuses={statuses} jurisdictions={jurisdictions} />
    </div>
  );
}
