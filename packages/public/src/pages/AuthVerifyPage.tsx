import Link from "next/link";
import { redirect } from "next/navigation";
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
  const result: VerifyResult = token
    ? await consumeVerificationToken(token)
    : { ok: false, reason: "missing" };

  if (result.ok) {
    // Email is now verified. Send the user to sign in — no session is
    // issued on this page, so they must authenticate before reaching the
    // portal. ?verified=1 lets /login show a confirmation banner.
    redirect("/login?verified=1");
  }

  if (result.reason === "missing") {
    return (
      <AuthShell
        eyebrow="Email verification"
        title={<>Missing verification link.</>}
        subtitle="Open the link sent to your inbox after registration."
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/login" className="btn btn-primary">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title={<>This link is no longer valid.</>}
      subtitle="It may have expired or already been used. Enter your email below and we'll send you a fresh verification link."
    >
      <ResendVerificationForm />
    </AuthShell>
  );
}
