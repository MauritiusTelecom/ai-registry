import { getTranslations } from "next-intl/server";
import { AuthShell } from "../auth-ui/AuthShell";
import { ResetPasswordForm } from "../auth-ui/ResetPasswordForm";

import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.setNewPassword");
}

export default async function ResetTokenPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("auth");
  return (
    <AuthShell
      eyebrow={t("resetPassword")}
      title={
        <>
          {t.rich("setNewPasswordTitle", {
            accent: (chunks) => <span className="gradient-text">{chunks}</span>
          })}
        </>
      }
      subtitle={t("setNewPasswordSubtitle")}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
