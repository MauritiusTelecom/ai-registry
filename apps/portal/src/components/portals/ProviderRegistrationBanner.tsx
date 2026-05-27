import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Shown under the provider portal header when the user cannot author resources yet.
 */
export async function ProviderRegistrationBanner({
  emailVerified,
  canAuthorResources
}: {
  emailVerified: boolean;
  canAuthorResources: boolean;
}) {
  if (canAuthorResources) return null;

  const t = await getTranslations("portalRegistration");

  if (!emailVerified) {
    return (
      <div
        className="p-registration-banner"
        role="status"
        style={{
          margin: "0 24px 0",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "rgba(var(--primary-rgb), 0.08)",
          fontSize: 14,
          color: "var(--text)",
          lineHeight: 1.45
        }}
      >
        <strong style={{ display: "block", marginBottom: 4 }}>{t("verifyEmailTitle")}</strong>
        <span style={{ color: "var(--text-2)" }}>
          {t("verifyEmailBody")}
        </span>{" "}
        <Link href="/auth/verify" className="p-footer-link" style={{ fontWeight: 500 }}>
          {t("resendVerification")}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="p-registration-banner"
      role="status"
      style={{
        margin: "0 24px 0",
        padding: "12px 16px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "rgba(var(--secondary-rgb), 0.08)",
        fontSize: 14,
        color: "var(--text)",
        lineHeight: 1.45
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>{t("completeProfileTitle")}</strong>
      <span style={{ color: "var(--text-2)" }}>
        {t("completeProfileBody")}
      </span>{" "}
      <Link href="/provider/settings" className="p-footer-link" style={{ fontWeight: 500 }}>
        {t("openSettings")}
      </Link>
    </div>
  );
}
