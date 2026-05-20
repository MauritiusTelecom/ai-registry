import { listAllFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqEntryForm } from "@/components/admin/site/FaqEntryForm";

export const metadata = { title: "Admin · Site · FAQ · New" };
export const dynamic = "force-dynamic";

export default async function AdminFaqNewPage() {
  // Suggest the next sort order so adding entries appends to the list.
  const rows = await listAllFaqEntries();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">New FAQ entry</h1>
        <p className="p-subtitle">
          Adds a row to <code>cms_faq_entry</code>. New entries default to
          active; the entry appears in the public FAQ section on the next
          request.
        </p>
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
