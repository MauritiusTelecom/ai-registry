import { notFound } from "next/navigation";
import { listAllFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqEntryForm } from "@/components/admin/site/FaqEntryForm";

export const metadata = { title: "Admin · Site · FAQ · Edit" };
export const dynamic = "force-dynamic";

export default async function AdminFaqEditPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const rows = await listAllFaqEntries();
  const row = rows.find((r) => r.code === code);
  if (!row) notFound();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">FAQ entry · {row.code}</h1>
        <p className="p-subtitle">
          Edit the question, answer, sort order, or hide the entry by toggling
          active.
        </p>
      </div>

      <FaqEntryForm
        mode="edit"
        initial={{
          code: row.code,
          question: row.question,
          answer: row.answer,
          sortOrder: row.sortOrder,
          active: row.active
        }}
      />
    </div>
  );
}
