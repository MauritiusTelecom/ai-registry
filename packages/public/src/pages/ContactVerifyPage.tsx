import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "../auth-ui/AuthShell";

import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.verifyContact");
}

type VerifyResult = { ok: true; email: string } | { ok: false; reason: string };

export default async function ContactVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("contactVerify");

  if (!token) {
    return (
      <AuthShell
        eyebrow={t("contactForm")}
        title={<>{t("missingConfirmationLink")}</>}
        subtitle={t("openLinkSubtitle")}
      >
        <div style={{ textAlign: "center" }}>
          <Link href="/contact" className="btn btn-primary">
            {t("backToContact")}
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
        eyebrow={t("emailConfirmed")}
        title={
          <>
            {t.rich("thankYouTitle", {
              accent: (chunks) => <span className="gradient-text">{chunks}</span>
            })}
          </>
        }
        subtitle={t("verifiedSubtitle", { email: result.email })}
      >
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/register" className="btn btn-primary">
            {t("createAccount")}
          </Link>
          <Link href="/login" className="btn btn-secondary">
            {t("signIn")}
          </Link>
          <Link href="/contact" style={{ color: "var(--text-2)", fontSize: 14 }}>
            {t("backToContact")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={t("contactForm")}
      title={<>{t("linkNoLongerValid")}</>}
      subtitle={t("linkExpiredSubtitle")}
    >
      <div style={{ textAlign: "center" }}>
        <Link href="/contact" className="btn btn-primary">
          {t("backToContact")}
        </Link>
      </div>
    </AuthShell>
  );
}
