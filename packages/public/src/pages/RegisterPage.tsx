import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@airegistry/sdk/server";
import { AuthShell } from "../auth-ui/AuthShell";
import { RegisterForm } from "../auth-ui/RegisterForm";

export const metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/portal");
  const t = await getTranslations("auth");

  return (
    <AuthShell
      eyebrow={t("register")}
      title={
        <>
          {t.rich("registerTitle", {
            accent: (chunks) => <span className="gradient-text">{chunks}</span>
          })}
        </>
      }
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("alreadyRegistered")}{" "}
          <Link href="/login" style={{ color: "var(--text-2)" }}>
            {t("signIn")}
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
