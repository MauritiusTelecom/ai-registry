import { getTranslations } from "next-intl/server";
import { listAllFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqEntryForm } from "@/components/admin/site/FaqEntryForm";

export const metadata = { title: "Admin · Site · FAQ · New" };
export const dynamic = "force-dynamic";

export default async function AdminFaqNewPage() {
  const t = await getTranslations("admin.siteFaq");
  // Suggest the next sort order so adding entries appends to the list.
  const rows = await listAllFaqEntries();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("newTitle")}</h1>
        <p className="p-subtitle">{t("newSubtitle")}</p>
      </div>

      <FaqEntryForm
        mode="create"
        initial={{
          code: "",
          question: "",
          answer: "",
          sortOrder: nextSortOrder,
          active: true
        }}
      />
    </div>
  );
}
