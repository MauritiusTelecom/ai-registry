import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Open data");
}

export default async function OpenDataPage() {
  const [{ portalDomain, openSourceRepoUrl }, t] = await Promise.all([
    getBranding(),
    getTranslations("openData")
  ]);
  const licenseUrl = `${openSourceRepoUrl.replace(/\/$/, "")}/blob/main/LICENSE`;
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
      <DocPanel title={t("whatIsOpenTitle")}>
        <p>{t("whatIsOpenBody")}</p>
      </DocPanel>

      <DocPanel title={t("airIdsPermanentTitle")}>
        <p>{t("airIdsPermanentBody")}</p>
      </DocPanel>

      <DocPanel title={t("immutableAuditTitle")}>
        <p>{t("immutableAuditBody")}</p>
      </DocPanel>

      <DocPanel title={t("licensingTitle")}>
        <p>
          {t("licensingBody", { portalDomain })}{" "}
          <a
            href={licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-2)" }}
          >
            Apache-2.0
          </a>
          .
        </p>
      </DocPanel>

      <DocPanel title={t("seeAlsoTitle")}>
        <p>
          {t("seeAlsoBody1")}{" "}
          <Link href="/docs" style={{ color: "var(--text-2)" }}>
            {t("technicalDocs")}
          </Link>{" "}
          {t("seeAlsoBody2")}{" "}
          <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
            {t("publicAuditLog")}
          </Link>
          .
        </p>
      </DocPanel>
    </DocPage>
  );
}
