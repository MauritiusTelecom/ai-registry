import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashTokenForLookup } from "@airegistry/sdk/server";
import { AuthShell } from "@/components/public/auth/AuthShell";
import { ResendVerificationForm } from "@/components/public/auth/ResendVerificationForm";

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

async function consumeVerificationToken(rawToken: string): Promise<VerifyResult> {
  const tokenHash = hashTokenForLookup(rawToken);
  const user = await prisma.user.findFirst({
    where: { verificationToken: tokenHash }
  });
  if (!user || !user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
    return { ok: false, reason: "expired_or_invalid" };
  }
  const activeStatus = await prisma.userStatusType.findUnique({
    where: { code: "active" }
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      ...(activeStatus ? { statusId: activeStatus.id } : {})
    }
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      entityType: "user",
      entityId: user.id,
      action: "user.email_verified"
    }
  });
  return { ok: true, email: user.email };
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
