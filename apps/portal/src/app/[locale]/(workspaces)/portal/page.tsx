import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { PageHero } from "@airegistry/ui-kit";
import { LogoutButton } from "@airegistry/ui-kit";
import { PortalProfileForm } from "@/components/portal/PortalProfileForm";
import { CONTACT_TOPIC_LABELS, type ContactTopicCode } from "@airegistry/sdk";
import { loadPortalHome } from "@airegistry/sdk/server";

function isStaff(roles: string[]) {
  return roles.includes("admin") || roles.includes("reviewer");
}

export const metadata = { title: "Your account" };

function topicLabel(code: string): string {
  return CONTACT_TOPIC_LABELS[code as ContactTopicCode] ?? code;
}

export default async function PortalPage() {
  const t = await getTranslations("portalHome");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/portal");

  const homeView = await loadPortalHome(user.id);
  const { organisationName, verifiedContacts } = homeView;
  const profile = { organisationName } as const;

  return (
    <div>
      <PageHero
        crumb={t("crumb")}
        title={
          <>
            {t("welcomeBack")} <span className="gradient-text">{user.name}</span>.
          </>
        }
        subtitle={
          t("signedInAs", { email: user.email }) +
          (user.emailVerified ? "" : ` · ${t("emailNotVerified")}`)
        }
      />

      <section className="section" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {!user.emailVerified ? (
            <div
              className="glass"
              style={{
                padding: 18,
                marginBottom: 24,
                display: "flex",
                gap: 14,
                alignItems: "center"
              }}
              role="status"
            >
              <span
                className="status-dot"
                style={{ background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }}
              />
              <div style={{ flex: 1, fontSize: 14 }}>
                <strong>{t("verifyYourEmail")}</strong> - {t("verificationLinkSent", { email: user.email })}
              </div>
            </div>
          ) : null}

          <div
            className="glass"
            style={{ padding: 28, display: "grid", gap: 18, marginBottom: 24 }}
          >
            <ProfileRow label={t("labelName")} value={user.name} />
            <ProfileRow label={t("labelEmail")} value={user.email} />
            <ProfileRow label={t("labelStatus")} value={user.status.name} />
            <ProfileRow label={t("labelRole")} value={user.role.name} />
            <ProfileRow
              label={t("labelProviderLinkage")}
              value={
                user.provider
                  ? `${user.provider.displayName} (${user.provider.slug})`
                  : t("notYetLinked")
              }
            />
            <ProfileRow
              label={t("labelOnboarding")}
              value={user.onboardingComplete ? t("complete") : t("pending")}
            />
            <PortalProfileForm
              initialName={user.name}
              initialOrganisation={profile?.organisationName ?? null}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 32
            }}
          >
            <Link href="/portal/resources" className="btn btn-primary">
              {t("myResources")}
            </Link>
            <Link href="/registry" className="btn btn-secondary">
              {t("browseRegistry")}
            </Link>
            <Link href="/providers" className="btn btn-secondary">
              {t("browseProviders")}
            </Link>
            {isStaff(user.roles) ? (
              <Link href="/admin" className="btn btn-secondary">
                {t("operatorConsole")}
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0, paddingBottom: 80 }}>
      <div className="glass" style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t("verifiedContactMessages")}</h2>
        <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20 }}>
          {t("contactMessagesDescription")}
        </p>
        {verifiedContacts.length === 0 ? (
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            {t("noVerifiedMessages")}{" "}
            <Link href="/contact" style={{ color: "var(--accent)" }}>
              {t("contactOperator")}
            </Link>{" "}
            {t("clickConfirmationLink")}
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {verifiedContacts.map((row) => (
              <li
                key={row.id}
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 16
                }}
              >
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
                  {new Date(row.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}{" "}
                  · {topicLabel(row.topic)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
                  {row.senderName} · {row.organisationName}
                </div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{row.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </section>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 16,
        alignItems: "baseline",
        borderBottom: "1px dashed var(--hairline)",
        paddingBottom: 12
      }}
    >
      <div
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-3)"
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, color: "var(--text)" }}>{value}</div>
    </div>
  );
}
