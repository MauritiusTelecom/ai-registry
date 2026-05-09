import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ensureUserProviderLinked } from "@/lib/portal/ensure-provider";
import { EditResourceForm } from "@/components/portal/EditResourceForm";

export const metadata = { title: "Provider · Edit resource" };
export const dynamic = "force-dynamic";

export default async function ProviderResourceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

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
    <div className="p-content">
      <div className="p-page-header">
        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
          <Link href="/provider/resources" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            ← My resources
          </Link>
        </p>
        <h1 className="p-title">Edit resource</h1>
        <p className="p-subtitle">
          {resource.title} · <span className="tag">{code.replace(/_/g, " ")}</span>
        </p>
      </div>

      <div className="p-card" style={{ padding: "22px 24px", maxWidth: 640, borderRadius: 12 }}>
        {!canEdit ? (
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            This resource cannot be edited in its current lifecycle state.{" "}
            <Link href="/provider/submissions">View submissions</Link> or{" "}
            <Link href="/provider/resources">all resources</Link>.
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
            variant="provider"
            postSubmitPath="/provider/submissions"
          />
        )}
      </div>
    </div>
  );
}
