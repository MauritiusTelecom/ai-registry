import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Verifier · Settings" };
export const dynamic = "force-dynamic";

/**
 * Verifier · Settings — read-only profile + reviewer preferences.
 *
 * The schema does not yet carry per-reviewer preferences (queue filters,
 * default review type, etc.); this page surfaces what IS persisted (the
 * reviewer's session envelope, recent decisions, separation-of-duties scope)
 * and links to the editable surfaces that DO exist (account password reset,
 * email verification). Full preference store lands once the spec adds a
 * `ReviewerPreference` model.
 *
 * Module spec: `modules/verifier/settings/product.md`.
 */
export default async function VerifierSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [decided30d, queued, conflicts] = await Promise.all([
    prisma.review.count({
      where: {
        reviewerId: user.id,
        status: { code: "decided" },
        completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.review.count({
      where: { status: { code: { in: ["open", "in_review"] } } }
    }),
    user.provider
      ? prisma.review.count({
          where: {
            status: { code: { in: ["open", "in_review"] } },
            resource: { providerId: user.provider.id }
          }
        })
      : Promise.resolve(0)
  ]);

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">Settings</h1>
        <p className="p-subtitle">
          Reviewer profile, queue scope, and account links. Per-reviewer queue preferences are not
          yet persisted in schema — this page reflects what IS stored.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title="Profile">
          <Row label="Name">{user.name}</Row>
          <Row label="Email" mono>
            {user.email}
          </Row>
          <Row label="Primary role">{user.role.name}</Row>
          <Row label="All roles" mono>
            {user.roles.join(", ")}
          </Row>
          <Row label="Email verified">
            {user.emailVerified ? "yes" : "no — check inbox"}
          </Row>
          <Row label="Provider linkage" mono>
            {user.provider ? `${user.provider.displayName} (${user.provider.slug})` : "—"}
          </Row>
        </Card>

        <Card title="Review activity">
          <Row label="Decided (30 days)" mono>
            {decided30d}
          </Row>
          <Row label="Queue (open + in review)" mono>
            {queued}
          </Row>
          {user.provider ? (
            <Row label="Self-conflict reviews" mono>
              {conflicts}
            </Row>
          ) : null}
          <p
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              marginTop: 8,
              lineHeight: 1.5
            }}
          >
            Reviews against your own provider record are blocked by{" "}
            <code>assertCanReview()</code> — they appear in the queue count but cannot be approved
            by you.
          </p>
        </Card>

        <Card title="Account">
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            Password and email are managed via the public auth surface:
          </p>
          <ul
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: 13,
              color: "var(--text-2)"
            }}
          >
            <li>
              <Link href="/auth/reset" className="p-footer-link">
                Request password reset
              </Link>
            </li>
            <li>
              <Link href="/portal" className="p-footer-link">
                Profile envelope
              </Link>
            </li>
          </ul>
        </Card>

        <Card title="Reviewer references">
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            <Link href="/admin/policies" className="p-footer-link">
              §11 sovereignty checklist
            </Link>{" "}
            · driving the review-decision form.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
            <Link href="/verifier/queue" className="p-footer-link">
              Queue
            </Link>{" "}
            ·{" "}
            <Link href="/verifier/decided" className="p-footer-link">
              Decided
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ padding: 20, borderRadius: 12 }}>
      <h2
        style={{
          fontSize: 12,
          fontFamily: "IBM Plex Mono, monospace",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 12
        }}
      >
        {title}
      </h2>
      <dl style={{ display: "grid", gap: 8, fontSize: 13, margin: 0 }}>{children}</dl>
    </section>
  );
}

function Row({
  label,
  children,
  mono = false
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        gap: 12,
        alignItems: "baseline"
      }}
    >
      <dt style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          color: "var(--text)",
          fontFamily: mono ? "IBM Plex Mono, monospace" : undefined,
          fontSize: mono ? 12.5 : undefined,
          wordBreak: "break-all"
        }}
      >
        {children}
      </dd>
    </div>
  );
}
