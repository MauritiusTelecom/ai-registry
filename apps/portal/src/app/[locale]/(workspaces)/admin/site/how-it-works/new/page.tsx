import { getTranslations } from "next-intl/server";
import { listAllHowItWorksSteps } from "@airegistry/core/services/public-cms";
import { HowItWorksStepForm } from "@/components/admin/site/HowItWorksStepForm";

export const metadata = { title: "Admin · Site · How it works · New" };
export const dynamic = "force-dynamic";

export default async function AdminHowItWorksNewPage() {
  const t = await getTranslations("admin.siteHowItWorks");
  const rows = await listAllHowItWorksSteps();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;
  const nextStepNumber = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.stepNumber)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{t("newTitle")}</h1>
        <p className="p-subtitle">{t("newSubtitle")}</p>
      </div>
      <HowItWorksStepForm
        mode="create"
        initial={{
          code: "",
          title: "",
          description: "",
          stepNumber: nextStepNumber,
          highlight: false,
          sortOrder: nextSortOrder,
          active: true
        }}
      />
    </div>
  );
}
