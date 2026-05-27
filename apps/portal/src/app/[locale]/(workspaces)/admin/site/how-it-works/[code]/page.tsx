import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { listAllHowItWorksSteps } from "@airegistry/core/services/public-cms";
import { HowItWorksStepForm } from "@/components/admin/site/HowItWorksStepForm";

export const metadata = { title: "Admin · Site · How it works · Edit" };
export const dynamic = "force-dynamic";

export default async function AdminHowItWorksEditPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const t = await getTranslations("admin.siteHowItWorks");
  const { code } = await params;
  const rows = await listAllHowItWorksSteps();
  const row = rows.find((r) => r.code === code);
  if (!row) notFound();

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{row.code}</h1>
      </div>
      <HowItWorksStepForm
        mode="edit"
        initial={{
          code: row.code,
          title: row.title,
          description: row.description,
          stepNumber: row.stepNumber,
          highlight: row.highlight,
          sortOrder: row.sortOrder,
          active: row.active
        }}
      />
    </div>
  );
}
