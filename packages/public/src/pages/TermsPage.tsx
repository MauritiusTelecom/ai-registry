import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("public.terms");
}

export default async function TermsPage() {
  const [{ registryName, operatorName }, t] = await Promise.all([
    getBranding(),
    getTranslations("terms")
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
      subtitle={t("pageSubtitle", { registryName })}
    >
      <DocPanel title={t("registryPointsTitle")}>
        <p>{t("registryPointsBody", { registryName })}</p>
      </DocPanel>

      <DocPanel title={t("listingNotEndorsementTitle")}>
        <p>
          {t("listingNotEndorsementBody1")}{" "}
          <Link href="/verification" style={{ color: "var(--text-2)" }}>
            {t("threeGovernanceSignals")}
          </Link>{" "}
          {t("listingNotEndorsementBody2")}
        </p>
      </DocPanel>

      <DocPanel title={t("acceptableUseTitle")}>
        <p>
          {t("acceptableUseBody1")}{" "}
          <Link href="/acceptable-use" style={{ color: "var(--text-2)" }}>
            {t("acceptableUsePolicy")}
          </Link>
          {t("acceptableUseBody2")}
        </p>
      </DocPanel>

      <DocPanel title={t("noWarrantyTitle")}>
        <p>{t("noWarrantyBody", { operatorName })}</p>
      </DocPanel>

      <DocPanel title={t("changesTitle")}>
        <p>
          {t("changesBody1")}{" "}
          <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
            {t("publicAuditLog")}
          </Link>
          {t("changesBody2")}{" "}
          <Link href="/contact" style={{ color: "var(--text-2)" }}>
            {t("theContactForm")}
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
