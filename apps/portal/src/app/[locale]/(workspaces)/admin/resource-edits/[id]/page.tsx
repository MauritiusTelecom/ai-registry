import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser, getDraftState } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import {
  AdminResourceEditDecision,
  type ProposedRelations
} from "@/components/admin/AdminResourceEditDecision";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Review edit · Admin" };
}

export default async function AdminResourceEditDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!user.roles.includes("admin") && !user.roles.includes("reviewer")) notFound();

  const { id } = await params;
  const state = await getDraftState(id, user);
  if (!state.draft) notFound();

  const submitted = state.draftStatus === "submitted";

  return (
    <div>
      <PageHero
        crumb={
          <>
            <Link href="/admin/resource-edits" style={{ color: "var(--text-3)", textDecoration: "none" }}>
              Resource edits
            </Link>{" "}
            · Review
          </>
        }
        title={state.live.title ?? "Resource edit"}
        subtitle="Compare the submitted update against the live listing, then approve or reject. Approving overwrites the live entry with these values."
      />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="glass" style={{ maxWidth: 900, margin: "0 auto", padding: 28 }}>
          {!submitted ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              This draft is not awaiting approval (status: {state.draftStatus ?? "none"}).
            </p>
          ) : state.diff.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: 14 }}>
              The submitted draft has no field changes against the live listing.
            </p>
          ) : (
            <AdminResourceEditDecision
              resourceId={id}
              versionId={state.draft.id}
              diff={state.diff}
              proposed={
                (state.draft.proposedPayload as unknown as ProposedRelations) ?? null
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
