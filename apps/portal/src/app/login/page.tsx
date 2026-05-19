import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@airegistry/sdk/server";
import { portalForRole } from "@/lib/portals/auth-gate";
import { AuthShell } from "@/components/public/auth/AuthShell";
import { LoginForm } from "@/components/public/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    next?: string;
    registered?: string;
    verified?: string;
    verify?: string;
  }>;
}) {
  const params = await searchParams;
  const sanitized = sanitizeNext(params.next);

  const user = await getCurrentUser();
  if (user) {
    // Already signed in - honour the deep-link if present, otherwise route
    // to the user's role-specific portal.
    redirect(sanitized ?? portalForRole(user.role.code));
  }

  const banner = pickBanner(params);

  return (
    <AuthShell
      eyebrow="Sign in"
      title={
        <>
          Welcome <span className="gradient-text">back</span>.
        </>
      }
      subtitle="Sign in with your registered email and password."
      footer={
        <>
          New here?{" "}
          <Link href="/register" style={{ color: "var(--text-2)" }}>
            Create an account
          </Link>{" "}
          ·{" "}
          <Link href="/auth/reset" style={{ color: "var(--text-2)" }}>
            Forgot password
          </Link>
        </>
      }
    >
      {banner ? (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "rgba(var(--primary-rgb), 0.08)",
            color: "var(--text)",
            fontSize: 13,
            lineHeight: 1.5
          }}
        >
          {banner}
        </div>
      ) : null}
      <LoginForm redirect={sanitized} />
    </AuthShell>
  );
}

function pickBanner(params: {
  registered?: string;
  verified?: string;
  verify?: string;
}): string | null {
  if (params.verified === "1") {
    return "Your email is verified. Sign in to continue.";
  }
  if (params.registered === "1") {
    return "Account created. Check your email for a verification link, then sign in.";
  }
  if (params.verify === "1") {
    return "Please verify your email before accessing the portal. Check your inbox or request a new link below.";
  }
  return null;
}

function sanitizeNext(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  // Only allow same-origin paths beginning with `/`. Refuse `//` (protocol-relative)
  // and full URLs.
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
