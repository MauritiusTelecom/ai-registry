import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "../auth-ui/AuthShell";
import { ResendVerificationForm } from "../auth-ui/ResendVerificationForm";
import { writeAudit } from "@airegistry/sdk";
import { consumeEmailVerificationToken } from "@airegistry/sdk/server";

export const metadata = { title: "Verify email" };

/**
 * Server-side verification page. Performs the same DB transition as
 * /api/auth/verify-email, but inline so the user sees the outcome on the
 * very first paint without an internal HTTP round-trip.
 *
 * The matching API route is preserved for programmatic clients.
 */

type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "expired_or_invalid" | "missing" };

// consumeEmailVerificationToken centralises the token-lookup / update /
// status-promotion / audit flow shared with /api/auth/verify-email. The
// service writes a single audit row through writeAudit (constitution §6).
async function consumeVerificationToken(rawToken: string): Promise<VerifyResult> {
  return consumeEmailVerificationToken(rawToken);
}

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");
  const result: VerifyResult = token
    ? await consumeVerificationToken(token)
    : { ok: false, reason: "missing" };

  if (result.ok) {
    redirect("/login?verified=1");
  }

  if (result.reason === "missing") {
    return (
      <AuthShell
        eyebrow={t("emailVerification")}
        title={<>{t("missingVerificationLink")}</>}
        subtitle={t("openVerificationLinkSubtitle")}
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/login" className="btn btn-primary">
            {t("backToSignIn")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={t("emailVerification")}
      title={<>{t("linkNoLongerValid")}</>}
      subtitle={t("linkExpiredSubtitle")}
    >
      <ResendVerificationForm />
    </AuthShell>
  );
}
