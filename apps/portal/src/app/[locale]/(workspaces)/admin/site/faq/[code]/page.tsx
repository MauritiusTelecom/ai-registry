import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listAllFaqEntries } from "@airegistry/core/services/public-cms";
import { FaqEntryForm } from "@/components/admin/site/FaqEntryForm";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.siteFaqEdit");
}

export const dynamic = "force-dynamic";

export default async function AdminFaqEditPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const t = await getTranslations("admin.siteFaq");
  const { code } = await params;
  const rows = await listAllFaqEntries();
  const row = rows.find((r) => r.code === code);
  if (!row) notFound();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{row.code}</h1>
        <p className="p-subtitle">{t("editSubtitle")}</p>
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
