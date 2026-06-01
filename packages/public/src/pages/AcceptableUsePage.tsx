import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.acceptableUse");
}

export default async function AcceptableUsePage() {
  const [{ portalDomain }, t] = await Promise.all([
    getBranding(),
    getTranslations("acceptableUse")
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
      <DocPanel title={t("whenSubmitTitle")}>
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>{t("whenSubmitItem1")}</li>
          <li>{t("whenSubmitItem2")}</li>
          <li>{t("whenSubmitItem3")}</li>
          <li>{t("whenSubmitItem4")}</li>
        </ul>
      </DocPanel>

      <DocPanel title={t("whenCallApisTitle")}>
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>{t("whenCallApisItem1")}</li>
          <li>{t("whenCallApisItem2")}</li>
          <li>{t("whenCallApisItem3", { portalDomain })}</li>
        </ul>
      </DocPanel>

      <DocPanel title={t("willNotListTitle")}>
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>{t("willNotListItem1")}</li>
          <li>{t("willNotListItem2")}</li>
          <li>{t("willNotListItem3")}</li>
        </ul>
      </DocPanel>

      <DocPanel title={t("reportingAppealsTitle")}>
        <p>
          {t("reportingAppealsBody1")}{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            {t("contactForm")}
          </Link>
          {t("reportingAppealsBody2")}{" "}
          <Link href="/governance#appeals" style={{ color: "var(--text-2)" }}>
            {t("appealsProcess")}
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
