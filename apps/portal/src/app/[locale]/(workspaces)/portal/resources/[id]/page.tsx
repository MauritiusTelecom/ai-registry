import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { PageHero } from "@airegistry/ui-kit";
import { EditResourceForm } from "@/components/portal/EditResourceForm";
import { loadPortalResourceForOwner } from "@airegistry/sdk/server";

export const metadata = { title: "Edit resource" };

export default async function PortalResourceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("portal.resourceEdit");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources");
  if (user.role.code !== "provider") redirect("/portal");

  const { id } = await params;
  const providerId = await ensureUserProviderLinked(user.id);

  const resource = await loadPortalResourceForOwner(id, providerId);
  if (!resource) notFound();

  const code = resource.lifecycleCode;
  const canEdit = resource.canEdit;
  const canSubmit = resource.canSubmit;

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
            {t("crumbEdit")}
          </>
        }
        title={resource.title}
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 640, margin: "0 auto", padding: 28 }}>
          {!canEdit ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              {t("notEditable", { code })}{" "}
              <Link href="/portal/resources">{t("backToList")}</Link>
            </p>
          ) : (
            <EditResourceForm
              resourceId={resource.id}
              initialTitle={resource.title}
              initialShort={resource.shortDescription ?? ""}
              initialLong={resource.longDescription}
              lifecycle={code}
              canEdit={canEdit}
              canSubmit={canSubmit}
            />
          )}
        </div>
      </section>
    </div>
  );
}
