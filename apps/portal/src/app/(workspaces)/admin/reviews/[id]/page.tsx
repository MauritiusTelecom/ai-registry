import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import { ReviewDecideForm } from "@/components/admin/ReviewDecideForm";
import { loadAdminReviewForDecide } from "@airegistry/sdk/server";

export const metadata = { title: "Review decision" };

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) notFound();

  const { id } = await params;
  const review = await loadAdminReviewForDecide(id);
  if (!review || !review.resourceId || !review.resource) notFound();
  if (review.status.code === "decided" || review.status.code === "withdrawn") {
    return (
      <div>
        <PageHero crumb="Admin · Reviews" title="Review closed" subtitle="This review has already been decided." />
        <section className="section">
          <p style={{ textAlign: "center" }}>
            <Link href="/admin/reviews">Back to queue</Link>
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
              Admin
            </Link>{" "}
            ·{" "}
            <Link href="/admin/reviews" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Reviews
            </Link>{" "}
            · Decision
          </>
        }
        title="Record review decision"
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 720, margin: "0 auto", padding: 28 }}>
          <ReviewDecideForm reviewId={review.id} resourceTitle={review.resource.title} />
        </div>
      </section>
    </div>
  );
}
