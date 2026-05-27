import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { portalForRole } from "@airegistry/core/auth/portal-for-role";
import { AuthShell } from "../auth-ui/AuthShell";
import { LoginForm } from "../auth-ui/LoginForm";

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
  const t = await getTranslations("auth");

  const user = await getCurrentUser();
  if (user) {
    redirect(sanitized ?? portalForRole(user.role.code));
  }

  const banner = pickBanner(params, t);

  return (
    <AuthShell
      eyebrow={t("signIn")}
      title={
        <>
          {t.rich("signInWelcome", {
            accent: (chunks) => <span className="gradient-text">{chunks}</span>
          })}
        </>
      }
      subtitle={t("signInSubtitle")}
      footer={
        <>
          {t("newHere")}{" "}
          <Link href="/register" style={{ color: "var(--text-2)" }}>
            {t("createAccount")}
          </Link>{" "}
          ·{" "}
          <Link href="/auth/reset" style={{ color: "var(--text-2)" }}>
            {t("forgotPassword")}
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

function pickBanner(
  params: { registered?: string; verified?: string; verify?: string },
  t: Awaited<ReturnType<typeof getTranslations<"auth">>>
): string | null {
  if (params.verified === "1") return t("emailVerified");
  if (params.registered === "1") return t("accountCreated");
  if (params.verify === "1") return t("pleaseVerify");
  return null;
}

function sanitizeNext(value: string | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  // Only allow same-origin paths beginning with `/`. Refuse `//` (protocol-relative)
  // and full URLs.
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
