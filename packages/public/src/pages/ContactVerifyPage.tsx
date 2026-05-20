import Link from "next/link";
import { AuthShell } from "../auth-ui/AuthShell";

export const metadata = { title: "Verify contact email" };

type VerifyResult = { ok: true; email: string } | { ok: false; reason: string };

export default async function ContactVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthShell
        eyebrow="Contact form"
        title={<>Missing confirmation link.</>}
        subtitle="Open the link from the email we sent after you submitted the contact form."
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/contact" className="btn btn-primary">
            Back to contact
          </Link>
        </div>
      </AuthShell>
    );
  }

  const res = await fetch(
    `/api/public/contact/verify?token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
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
        eyebrow="Email confirmed"
        title={
          <>
            Thank you - your address is <span className="gradient-text">verified</span>.
          </>
        }
        subtitle={`We have marked your enquiry as verified for ${result.email}.`}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/register" className="btn btn-primary">
            Create an account
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign in
          </Link>
          <Link href="/contact" style={{ color: "var(--text-2)", fontSize: 14 }}>
            Back to contact
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Contact form"
      title={<>This confirmation link is no longer valid.</>}
      subtitle="It may have expired or already been used. You can submit the form again if you still need help."
    >
      <div style={{ textAlign: "center" }}>
        <Link href="/contact" className="btn btn-primary">
          Back to contact
        </Link>
      </div>
    </AuthShell>
  );
}
