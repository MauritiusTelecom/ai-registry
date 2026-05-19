import Link from "next/link";
import { getCurrentUser } from "@airegistry/sdk/server";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/portals/StatCard";
import { GatedPublishButton } from "@/components/portals/GatedPublishButton";

export const metadata = { title: "Provider · Dashboard" };
export const dynamic = "force-dynamic";

export default async function ProviderDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  // Layout already enforced auth; this is the canonical lookup for provider scoping.
  const providerId = user?.provider?.id ?? null;

  const stats = providerId
    ? await Promise.all([
        // Catalogue
        prisma.resource.count({ where: { providerId } }),
        prisma.resource.count({
          where: { providerId, lifecycleStatus: { code: "listed" } }
        }),
        prisma.resource.count({
          where: {
            providerId,
            lifecycleStatus: {
              code: { in: ["draft", "submitted", "in_review", "needs_update"] }
            }
          }
        }),
        // Inbox: complaints filed at me or my resources
        prisma.complaint.count({
          where: {
            OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }],
            status: { code: { in: ["open", "investigating"] } }
          }
        }),
        // Inbox: reviews of my stuff
        prisma.review.count({
          where: {
            OR: [{ providerId }, { resource: { providerId } }],
            status: { code: { in: ["open", "in_review"] } }
          }
        }),
        // Inbox: enforcement actions on my stuff
        prisma.enforcementAction.count({
          where: {
            OR: [{ targetProviderId: providerId }, { targetResource: { providerId } }]
          }
        })
      ])
    : [0, 0, 0, 0, 0, 0];

  const [
    resources,
    listed,
    openSubs,
    openComplaints,
    openReviews,
    enforcementActions
  ] = stats;

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">
          {user?.provider?.displayName ?? user?.name} - Provider portal
        </h1>
        <p className="p-subtitle">
          {providerId
            ? "Catalogue, the public's inbox, and operations for your provider."
            : "Your account isn't linked to a provider yet. An admin will assign you to one."}
        </p>
        {providerId ? (
          <div className="p-actions" style={{ marginTop: 12 }}>
            <GatedPublishButton
              href="/provider/publish"
              canAuthorResources={user.canAuthorResources}
              emailVerified={user.emailVerified}
            >
              Publish resource
            </GatedPublishButton>
          </div>
        ) : null}
      </div>

      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
        Catalogue
      </h2>
      <div className="p-stat-grid">
        <StatCard
          label="Listed resources"
          value={listed}
          hint={`of ${resources} total`}
          href="/provider/resources"
        />
        <StatCard
          label="Submissions in flight"
          value={openSubs}
          intent={openSubs > 0 ? "warning" : "positive"}
          hint={openSubs > 0 ? "drafts / in-review / needs-update" : "all listed"}
          href="/provider/submissions"
        />
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-3)", fontFamily: "IBM Plex Mono, monospace" }}>
        Inbox
      </h2>
      <div className="p-stat-grid">
        <StatCard
          label="Open complaints"
          value={openComplaints}
          intent={openComplaints > 0 ? "warning" : "positive"}
          href="/provider/complaints"
        />
        <StatCard
          label="Open reviews"
          value={openReviews}
          intent={openReviews > 0 ? "warning" : "positive"}
          hint={openReviews > 0 ? "awaiting reviewer decision" : "none in flight"}
          href="/provider/reviews"
        />
        <StatCard
          label="Enforcement actions"
          value={enforcementActions}
          intent={enforcementActions > 0 ? "warning" : "positive"}
          href="/provider/incidents"
        />
      </div>

      <h2 style={{ marginTop: 28, marginBottom: 12, fontSize: 18 }}>What you can do here</h2>
      <div className="p-stat-grid">
        <ActionCard
          title="My resources"
          href="/provider/resources"
          body="Models, agents, tools, and skills your provider operates."
        />
        <ActionCard
          title="Submissions"
          href="/provider/submissions"
          body="Resources still in flight - drafts, in-review, or needs-update."
        />
        <ActionCard
          title="Complaints"
          href="/provider/complaints"
          body="Public reports filed against your provider or resources."
        />
        <ActionCard
          title="Reviews"
          href="/provider/reviews"
          body="Sovereignty / verification reviews of your records."
        />
        <ActionCard
          title="Incidents"
          href="/provider/incidents"
          body="Operator enforcement actions taken against your records."
        />
      </div>
    </div>
  );
}

function ActionCard({ title, href, body }: { title: string; href: string; body: string }) {
  // `feature-card` paints the same primary→tertiary gradient-ring glow used
  // on the public-home cards (.pillar / .r-card) and on the dashboard's
  // StatCard tiles. `p-stat-card-link` adds the matching hover lift and
  // focus ring so all the clickable cards on this page share one effect.
  return (
    <Link
      href={href}
      className="feature-card p-stat-card-link"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 22px",
        color: "inherit"
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>{body}</div>
    </Link>
  );
}
