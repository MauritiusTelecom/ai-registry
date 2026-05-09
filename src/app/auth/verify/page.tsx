import Link from "next/link";
import { AuthShell } from "@/components/public/auth/AuthShell";

export const metadata = { title: "Verify email" };

type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

async function verify(token: string, origin: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as VerifyResult;
    return data;
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
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

  // Server-side hit the verification endpoint so the user lands directly on
  // the outcome rather than seeing a flicker of a loading state.
  const headers = new Headers();
  // We can't easily reach `req.url` from a page; the Next.js runtime exposes
  // origin only via the request lifecycle. Use a relative fetch which Next
  // resolves to the same origin in server context.
  const res = await fetch(
    `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    { cache: "no-store", headers }
  ).catch(async () => null);
  let result: VerifyResult;
  if (res) {
    result = (await res.json()) as VerifyResult;
  } else {
    result = { ok: false, reason: "request_failed" };
  }

  if (result.ok) {
    return (
      <AuthShell
        eyebrow="Email verified"
        title={
          <>
            You're <span className="gradient-text">all set</span>.
          </>
        }
        subtitle={`Confirmed for ${result.email}.`}
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/portal" className="btn btn-primary">
            Go to your portal
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title={<>This link is no longer valid.</>}
      subtitle="It may have expired or already been used. Sign in and re-request a verification email from your portal."
    >
      <div style={{ textAlign: "center" }}>
        <Link href="/login" className="btn btn-primary">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}

// Suppress the unused warning for `verify` re-export (kept above for future
// callers like a client-side polling component).
export { verify };
