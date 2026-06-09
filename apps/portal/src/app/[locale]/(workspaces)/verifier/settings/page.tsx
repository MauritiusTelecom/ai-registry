import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { loadVerifierSettingsStats } from "@airegistry/sdk/server";

import { workspaceMetadata } from "@/lib/i18n/workspace-metadata";

export async function generateMetadata() {
  return workspaceMetadata("verifier.settings");
}

export const dynamic = "force-dynamic";

/**
 * Verifier · Settings - read-only profile + reviewer preferences.
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
  const i18n = await getTranslations("verifier.settings");
  const user = await getCurrentUser();
  if (!user) return null;

  const { decidedLast30Days: decided30d, queued, conflicts } =
    await loadVerifierSettingsStats(user.id, {
      providerId: user.provider?.id ?? null
    });

  return (
    <div className="p-content">
      <div className="p-page-header">
        <h1 className="p-title">{i18n("title")}</h1>
        <p className="p-subtitle">{i18n("subtitle")}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18
        }}
      >
        <Card title={i18n("cardProfile")}>
          <Row label={i18n("labelName")}>{user.name}</Row>
          <Row label={i18n("labelEmail")} mono>
            {user.email}
          </Row>
          <Row label={i18n("labelPrimaryRole")}>{user.role.name}</Row>
          <Row label={i18n("labelAllRoles")} mono>
            {user.roles.join(", ")}
          </Row>
          <Row label={i18n("labelEmailVerified")}>
            {user.emailVerified ? i18n("yes") : i18n("noCheckInbox")}
          </Row>
          <Row label={i18n("labelProviderLinkage")} mono>
            {user.provider ? `${user.provider.displayName} (${user.provider.slug})` : "-"}
          </Row>
        </Card>

        <Card title={i18n("cardReviewActivity")}>
          <Row label={i18n("labelDecided30d")} mono>
            {decided30d}
          </Row>
          <Row label={i18n("labelQueueOpenInReview")} mono>
            {queued}
          </Row>
          {user.provider ? (
            <Row label={i18n("labelSelfConflict")} mono>
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
            {i18n("selfConflictNote")}
          </p>
        </Card>

        <Card title={i18n("cardAccount")}>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            {i18n("accountDescription")}
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
                {i18n("linkPasswordReset")}
              </Link>
            </li>
            <li>
              <Link href="/portal" className="p-footer-link">
                {i18n("linkProfileEnvelope")}
              </Link>
            </li>
          </ul>
        </Card>

        <Card title={i18n("cardReviewerReferences")}>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            <Link href="/verifier/queue" className="p-footer-link">
              {i18n("linkQueue")}
            </Link>{" "}
            ·{" "}
            <Link href="/verifier/decided" className="p-footer-link">
              {i18n("linkDecided")}
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
