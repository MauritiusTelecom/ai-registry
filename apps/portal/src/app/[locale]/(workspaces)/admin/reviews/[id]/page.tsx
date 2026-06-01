import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import { ReviewDecideForm } from "@/components/admin/ReviewDecideForm";
import { loadAdminReviewForDecide } from "@airegistry/sdk/server";


import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("admin.reviewDecision");
}

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("admin.reviewDetail");
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) notFound();

  const { id } = await params;
  const review = await loadAdminReviewForDecide(id);
  if (!review || !review.resourceId || !review.resource) notFound();
  if (review.status.code === "decided" || review.status.code === "withdrawn") {
    return (
      <div>
        <PageHero crumb={t("crumbAdmin") + " · " + t("crumbReviews")} title={t("closedTitle")} subtitle={t("closedSubtitle")} />
        <section className="section">
          <p style={{ textAlign: "center" }}>
            <Link href="/admin/reviews">{t("backToQueue")}</Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/admin" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {t("crumbAdmin")}
            </Link>{" "}
            ·{" "}
            <Link href="/admin/reviews" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              {t("crumbReviews")}
            </Link>{" "}
            {t("crumbDecision")}
          </>
        }
        title={t("decisionTitle")}
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 720, margin: "0 auto", padding: 28 }}>
          <ReviewDecideForm reviewId={review.id} resourceTitle={review.resource.title} />
        </div>
      </section>
    </div>
  );
}
