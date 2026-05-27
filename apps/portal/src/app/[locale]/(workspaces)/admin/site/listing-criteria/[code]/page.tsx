import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listAllListingCriteria } from "@airegistry/core/services/public-cms";
import { ListingCriterionForm } from "@/components/admin/site/ListingCriterionForm";

export const metadata = { title: "Admin · Site · Listing criteria · Edit" };
export const dynamic = "force-dynamic";

export default async function AdminListingCriteriaEditPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const t = await getTranslations("admin.siteListingCriteria");
  const { code } = await params;
  const rows = await listAllListingCriteria();
  const row = rows.find((r) => r.code === code);
  if (!row) notFound();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{row.code}</h1>
      </div>
      <ListingCriterionForm
        mode="edit"
        initial={{
          code: row.code,
          title: row.title,
          description: row.description,
          iconName: row.iconName,
          sortOrder: row.sortOrder,
          active: row.active
        }}
      />
    </div>
  );
}
