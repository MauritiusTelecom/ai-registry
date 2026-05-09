import Link from "next/link";

/**
 * Shown under the provider portal header when the user cannot author resources yet.
 */
export function ProviderRegistrationBanner({
  emailVerified,
  canAuthorResources
}: {
  emailVerified: boolean;
  canAuthorResources: boolean;
}) {
  if (canAuthorResources) return null;

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
        <strong style={{ display: "block", marginBottom: 4 }}>Verify your email</strong>
        <span style={{ color: "var(--text-2)" }}>
          Check your inbox for the verification link. Until your email is verified you cannot submit
          resources.
        </span>{" "}
        <Link href="/auth/verify" className="p-footer-link" style={{ fontWeight: 500 }}>
          Resend or open verification →
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
      <strong style={{ display: "block", marginBottom: 4 }}>Complete your organisation profile</strong>
      <span style={{ color: "var(--text-2)" }}>
        Finish your provider details in Settings before you can create or submit resources.
      </span>{" "}
      <Link href="/provider/settings" className="p-footer-link" style={{ fontWeight: 500 }}>
        Open Settings →
      </Link>
    </div>
  );
}
