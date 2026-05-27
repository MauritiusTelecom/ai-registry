import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { getConfig } from "@airegistry/sdk";
import { PageHero } from "@airegistry/ui-kit";
import { NewResourceForm } from "@/components/portal/NewResourceForm";
import { listReferenceTable } from "@airegistry/sdk/server";

export const metadata = { title: "New resource" };

export default async function PortalNewResourcePage() {
  const t = await getTranslations("portal.resourceNew");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources/new");
  if (user.role.code !== "provider") redirect("/portal");

  const cfg = getConfig();
  // DB-active types ∩ env RESOURCE_TYPES restriction — admins can hide a
  // type without a redeploy by flipping ResourceType.active.
  const allowedTypes = await listReferenceTable("resourceType", { codes: cfg.resourceTypes });

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/portal" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {t("crumbPortal")}
            </Link>{" "}
            ·{" "}
            <Link href="/portal/resources" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {t("crumbResources")}
            </Link>{" "}
            {t("crumbNew")}
          </>
        }
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 560, margin: "0 auto", padding: 28 }}>
          <NewResourceForm allowedTypes={allowedTypes} />
        </div>
      </section>
    </div>
  );
}
