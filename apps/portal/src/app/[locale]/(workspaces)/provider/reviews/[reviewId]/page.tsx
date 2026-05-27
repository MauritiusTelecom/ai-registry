import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { localeRedirect } from "@/i18n/locale-redirect";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@airegistry/sdk/server";
import {
  canAccessThread,
  loadReviewForAccess
} from "@airegistry/core/services/review-thread";

import { ThreadConversation } from "@/components/portal/ThreadConversation";

export const metadata = { title: "Provider · Review" };
export const dynamic = "force-dynamic";

export default async function ProviderReviewDetailPage({
  params
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const t = await getTranslations("provider.reviews");
  const user = await getCurrentUser();
  if (!user) return await localeRedirect("/login");

  const { reviewId } = await params;
  const review = await loadReviewForAccess(reviewId);
  if (!review) notFound();
  if (!canAccessThread(user, review)) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">{t("forbidden")}</h1>
        <p className="text-sm opacity-70 mt-2">
          {t("noProviderSubtitle")}
        </p>
        <Link href="/provider/reviews" className="text-sm underline">
          {t("backToReviews")}
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/provider/reviews" className="text-xs opacity-70 hover:opacity-100">
          ← {t("backToReviews")}
        </Link>
        <h1 className="text-xl font-semibold">
          {review.resource?.title ?? t("untitledResource")}
        </h1>
        <p className="text-sm opacity-70">
          {t("reviewIdLabel")} <code className="opacity-60">{reviewId.slice(0, 8)}</code>
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">
          {t("conversationTitle")}
        </h2>
        <ThreadConversation reviewId={reviewId} viewerRole="provider" canCompose={true} />
      </section>
    </main>
  );
}
