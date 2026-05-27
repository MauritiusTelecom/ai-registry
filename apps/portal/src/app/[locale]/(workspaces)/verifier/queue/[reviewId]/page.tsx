import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@airegistry/core";
import {
  canAccessThread,
  loadReviewForAccess
} from "@airegistry/core/services/review-thread";
import { loadProviderDocuments } from "@airegistry/core/services/sovereignty-documents";

import { ThreadConversation } from "@/components/portal/ThreadConversation";
import { VerificationDocumentsPanel } from "@/components/portal/VerificationDocumentsPanel";

export const metadata = { title: "Verifier · Review" };
export const dynamic = "force-dynamic";

export default async function VerifierReviewDetailPage({
  params
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const t = await getTranslations("verifier.reviewDetail");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { reviewId } = await params;
  const review = await loadReviewForAccess(reviewId);
  if (!review) notFound();
  if (!canAccessThread(user, review)) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">{t("forbidden")}</h1>
        <p className="text-sm opacity-70 mt-2">
          {t("forbidden")}
        </p>
        <Link href="/verifier/queue" className="text-sm underline">
          {t("backToQueue")}
        </Link>
      </main>
    );
  }

  const viewerRole: "verifier" | "admin" | "provider" =
    user.roles.includes("admin") || user.role.code === "admin"
      ? "admin"
      : "verifier";

  const providerId = review.resource?.provider?.id;
  const resourceId = review.resource?.id;

  const [providerDocuments, evidenceFiles] = await Promise.all([
    providerId ? loadProviderDocuments({ providerId, includePrivate: true }) : Promise.resolve([]),
    resourceId
      ? prisma.sovereigntyEvidence.findMany({
          where: { resourceId, fileStorageKey: { not: null } },
          include: { evidenceType: true, sovereigntyBasis: true }
        })
      : Promise.resolve([])
  ]);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/verifier/queue" className="text-xs opacity-70 hover:opacity-100">
          ← {t("backToQueue")}
        </Link>
        <h1 className="text-xl font-semibold">
          {review.resource?.title ?? t("untitledResource")}
        </h1>
        <p className="text-sm opacity-70">
          {t("providerLabel")} {review.resource?.provider?.displayName ?? t("providerNone")} · {t("reviewIdLabel")}{" "}
          <code className="opacity-60">{reviewId.slice(0, 8)}</code>
        </p>
      </header>

      <VerificationDocumentsPanel
        providerDocuments={providerDocuments.map((d) => ({
          id: d.id,
          title: d.title,
          documentTypeName: d.documentType.name,
          filename: d.filename,
          sizeBytes: d.sizeBytes,
          contentType: d.contentType,
          publicVisibility: d.publicVisibility,
          expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
          url: `/api/portal/provider/documents/${d.id}/file`
        }))}
        evidenceFiles={evidenceFiles.map((e) => ({
          id: e.id,
          title: e.title,
          evidenceTypeName: e.evidenceType.name,
          sovereigntyBasisName: e.sovereigntyBasis.name,
          filename: e.fileFilename ?? "file",
          sizeBytes: e.fileSizeBytes ?? 0,
          contentType: e.fileContentType ?? "application/octet-stream",
          publicVisibility: e.publicVisibility,
          url: resourceId
            ? `/api/portal/resources/${resourceId}/evidence/${e.id}/file`
            : ""
        }))}
      />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">
          {t("conversationTitle")}
        </h2>
        <ThreadConversation reviewId={reviewId} viewerRole={viewerRole} canCompose={true} />
      </section>
    </main>
  );
}
