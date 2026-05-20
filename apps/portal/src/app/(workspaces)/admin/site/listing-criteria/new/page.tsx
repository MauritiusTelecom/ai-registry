import { listAllListingCriteria } from "@airegistry/core/services/public-cms";
import { ListingCriterionForm } from "@/components/admin/site/ListingCriterionForm";

export const metadata = { title: "Admin · Site · Listing criteria · New" };
export const dynamic = "force-dynamic";

export default async function AdminListingCriteriaNewPage() {
  const rows = await listAllListingCriteria();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">New criterion</h1>
        <p className="p-subtitle">Adds a row to <code>cms_listing_criterion</code>.</p>
      </div>
      <ListingCriterionForm
        mode="create"
        initial={{
          code: "",
          title: "",
          description: "",
          iconName: "check",
          sortOrder: nextSortOrder,
          active: true
        }}
      />
    </div>
  );
}
