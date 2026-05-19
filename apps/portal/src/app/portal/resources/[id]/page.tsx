import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { PageHero } from "@/components/public/sections/PageHero";
import { EditResourceForm } from "@/components/portal/EditResourceForm";

export const metadata = { title: "Edit resource" };

export default async function PortalResourceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal/resources");
  if (user.role.code !== "provider") redirect("/portal");

  const { id } = await params;
  const providerId = await ensureUserProviderLinked(user.id);

  const resource = await prisma.resource.findFirst({
    where: { id, providerId },
    include: { lifecycleStatus: { select: { code: true } } }
  });
  if (!resource) notFound();

  const code = resource.lifecycleStatus.code;
  const canEdit = code === "draft" || code === "needs_update";
  const canSubmit = code === "draft" || code === "needs_update";

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/portal" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Portal
            </Link>{" "}
            ·{" "}
            <Link href="/portal/resources" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Resources
            </Link>{" "}
            · Edit
          </>
        }
        title={resource.title}
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 640, margin: "0 auto", padding: 28 }}>
          {!canEdit ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              This resource is not editable from the portal in its current lifecycle state ({code}).{" "}
              <Link href="/portal/resources">Back to list</Link>
            </p>
          ) : (
            <EditResourceForm
              resourceId={resource.id}
              initialTitle={resource.title}
              initialShort={resource.shortDescription}
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
