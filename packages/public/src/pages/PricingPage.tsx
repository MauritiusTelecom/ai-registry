import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Pricing");
}

export default async function PricingPage() {
  const [{ operatorName, portalDomain }, t] = await Promise.all([
    getBranding(),
    getTranslations("pricing")
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
      title={
        <>
          {t.rich("pageTitle", {
            accent: (chunks) => <span className="gradient-text">{chunks}</span>
          })}
        </>
      }
      subtitle={t("pageSubtitle")}
    >
      <DocPanel title={t("whatIsFreeTitle")}>
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>{t("whatIsFreeItem1")}</li>
          <li>{t("whatIsFreeItem2")}</li>
          <li>{t("whatIsFreeItem3")}</li>
          <li>{t("whatIsFreeItem4")}</li>
          <li>{t("whatIsFreeItem5")}</li>
        </ul>
      </DocPanel>

      <DocPanel title={t("whatRegistryDoesNotDoTitle")}>
        <p>{t("whatRegistryDoesNotDoBody")}</p>
      </DocPanel>

      <DocPanel title={t("operatorCostsTitle")}>
        <p>{t("operatorCostsBody", { operatorName, portalDomain })}</p>
        <p style={{ marginTop: 14 }}>
          {t("seeWhitepaper")}{" "}
          <Link href="/whitepaper" style={{ color: "var(--text-2)" }}>
            {t("theWhitepaper")}
          </Link>{" "}
          {t("forFullModel")}
        </p>
      </DocPanel>
    </DocPage>
  );
}
