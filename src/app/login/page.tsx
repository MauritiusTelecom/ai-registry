import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { portalForRole } from "@/lib/portals/auth-gate";
import { AuthShell } from "@/components/public/auth/AuthShell";
import { LoginForm } from "@/components/public/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const sanitized = sanitizeNext(next);

  const user = await getCurrentUser();
  if (user) {
    // Already signed in — honour the deep-link if present, otherwise route
    // to the user's role-specific portal.
    redirect(sanitized ?? portalForRole(user.role.code));
  }

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
      <LoginForm redirect={sanitized} />
    </AuthShell>
  );
}

function sanitizeNext(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  // Only allow same-origin paths beginning with `/`. Refuse `//` (protocol-relative)
  // and full URLs.
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
