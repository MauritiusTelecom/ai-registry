import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@airegistry/sdk/server";
import {
  canAccessThread,
  loadReviewForAccess
} from "@airegistry/core/services/review-thread";

import { ThreadConversation } from "@/components/portal/ThreadConversation";

export const metadata = { title: "Verifier · Review" };
export const dynamic = "force-dynamic";

export default async function VerifierReviewDetailPage({
  params
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { reviewId } = await params;
  const review = await loadReviewForAccess(reviewId);
  if (!review) notFound();
  if (!canAccessThread(user, review)) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="text-sm opacity-70 mt-2">
          You do not have permission to view this review.
        </p>
        <Link href="/verifier/queue" className="text-sm underline">
          Back to queue
        </Link>
      </main>
    );
  }

  const viewerRole: "verifier" | "admin" | "provider" =
    user.roles.includes("admin") || user.role.code === "admin"
      ? "admin"
      : "verifier";

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/verifier/queue" className="text-xs opacity-70 hover:opacity-100">
          ← Back to queue
        </Link>
        <h1 className="text-xl font-semibold">
          {review.resource?.title ?? "Untitled resource"}
        </h1>
        <p className="text-sm opacity-70">
          Provider: {review.resource?.provider?.displayName ?? "(none)"} · Review id:{" "}
          <code className="opacity-60">{reviewId.slice(0, 8)}</code>
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-3">
          Conversation
        </h2>
        <ThreadConversation reviewId={reviewId} viewerRole={viewerRole} canCompose={true} />
      </section>
    </main>
  );
}
