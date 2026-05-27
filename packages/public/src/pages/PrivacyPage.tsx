import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Privacy");
}

export default async function PrivacyPage() {
  const [{ registryName, operatorName, privacyDataProtectionAct }, t] = await Promise.all([
    getBranding(),
    getTranslations("privacy")
  ]);
  return (
    <DocPage
      crumb={
        <>
          <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            {t("home")}
          </Link>{" "}
          · {t("title")}
        </>
      }
      title={t("title")}
      subtitle={t("pageSubtitle")}
    >
      <DocPanel title={t("whatWeHoldTitle")}>
        <p>{t("whatWeHoldIntro")}</p>
        <ul style={{ paddingLeft: 22, marginTop: 10, display: "grid", gap: 8 }}>
          <li>
            {t.rich("whatWeHoldItem1", {
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </li>
          <li>
            {t.rich("whatWeHoldItem2", {
              strong: (chunks) => <strong>{chunks}</strong>
            })}
          </li>
        </ul>
      </DocPanel>

      <DocPanel title={t("lawfulBasisTitle")}>
        <p>{t("lawfulBasisBody", { privacyDataProtectionAct })}</p>
      </DocPanel>

      <DocPanel title={t("whatWeDontDoTitle")}>
        <p>{t("whatWeDontDoBody")}</p>
      </DocPanel>

      <DocPanel title={t("yourRightsTitle")}>
        <p>
          {t("yourRightsBody1")}{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            {t("theContactForm")}
          </Link>
          {t("yourRightsBody2")}
        </p>
      </DocPanel>

      <DocPanel title={t("operatorTitle")}>
        <p>{t("operatorBody", { registryName, operatorName })}</p>
      </DocPanel>
    </DocPage>
  );
}
