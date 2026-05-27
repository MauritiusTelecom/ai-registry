import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Audit log");
}

export default async function AuditLogPage() {
  const t = await getTranslations("publicAudit");
  return (
    <DocPage
      crumb={
        <>
          <Link href="/governance" style={{ color: "var(--text-3)", textDecoration: "none" }}>
            {t("governanceLink")}
          </Link>{" "}
          · {t("crumbLabel")}
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
      <DocPanel title={t("whatIsRecordedTitle")}>
        <ul style={{ paddingLeft: 22, display: "grid", gap: 8 }}>
          <li>{t("whatIsRecordedItem1")}</li>
          <li>{t("whatIsRecordedItem2")}</li>
          <li>{t("whatIsRecordedItem3")}</li>
          <li>{t("whatIsRecordedItem4")}</li>
          <li>{t("whatIsRecordedItem5")}</li>
          <li>{t("whatIsRecordedItem6")}</li>
        </ul>
      </DocPanel>

      <DocPanel title={t("appendOnlyTitle")}>
        <p>{t("appendOnlyBody")}</p>
      </DocPanel>

      <DocPanel title={t("publicLogTitle")}>
        <p>
          {t.rich("publicLogBody", {
            docsLink: (chunks) => (
              <Link href="/docs" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            ),
            govLink: (chunks) => (
              <Link href="/governance" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            )
          })}
        </p>
      </DocPanel>
    </DocPage>
  );
}
