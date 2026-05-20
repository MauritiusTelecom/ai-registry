import { listAllHowItWorksSteps } from "@airegistry/core/services/public-cms";
import { HowItWorksStepForm } from "@/components/admin/site/HowItWorksStepForm";

export const metadata = { title: "Admin · Site · How it works · New" };
export const dynamic = "force-dynamic";

export default async function AdminHowItWorksNewPage() {
  const rows = await listAllHowItWorksSteps();
  const nextSortOrder = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sortOrder)) + 1;
  const nextStepNumber = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.stepNumber)) + 1;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">New step</h1>
        <p className="p-subtitle">Adds a row to <code>cms_how_it_works_step</code>.</p>
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
