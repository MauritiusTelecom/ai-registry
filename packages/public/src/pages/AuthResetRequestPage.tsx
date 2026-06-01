import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "../auth-ui/AuthShell";
import { RequestResetForm } from "../auth-ui/RequestResetForm";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.resetPassword");
}

export default async function RequestResetPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell
      eyebrow={t("resetPassword")}
      title={
        <>
          {t.rich("forgotPasswordTitle", {
            accent: (chunks) => <span className="gradient-text">{chunks}</span>
          })}
        </>
      }
      subtitle={t("forgotPasswordSubtitle")}
      footer={
        <>
          {t("rememberedPassword")}{" "}
          <Link href="/login" style={{ color: "var(--text-2)" }}>
            {t("signIn")}
          </Link>
        </>
      }
    >
      <RequestResetForm />
    </AuthShell>
  );
}
