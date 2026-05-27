import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getBranding } from "@airegistry/core/branding";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Whitepaper");
}

export default async function WhitepaperPage() {
  const [{ operatorName, portalDomain }, t] = await Promise.all([
    getBranding(),
    getTranslations("whitepaper")
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
      <DocPanel title={t("whyNowTitle")}>
        <p>{t("whyNowBody1")}</p>
        <p style={{ marginTop: 14 }}>{t("whyNowBody2")}</p>
        <p style={{ marginTop: 14 }}>{t("whyNowBody3")}</p>
      </DocPanel>

      <DocPanel title={t("disciplineTitle")}>
        <p>
          {t.rich("disciplineBody1", {
            strong: (chunks) => <strong>{chunks}</strong>
          })}
        </p>
        <p style={{ marginTop: 14 }}>{t("disciplineBody2")}</p>
        <p style={{ marginTop: 14, color: "var(--text-2)" }}>
          <em>{t("disciplineBody3")}</em>
        </p>
      </DocPanel>

      <DocPanel title={t("whatGetsListedTitle")}>
        <p>
          {t.rich("whatGetsListedBody1", {
            strong: (chunks) => <strong>{chunks}</strong>,
            link: (chunks) => (
              <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            )
          })}
        </p>
        <p style={{ marginTop: 14 }}>{t("whatGetsListedBody2")}</p>
      </DocPanel>

      <DocPanel title={t("governanceTitle")}>
        <p>
          {t.rich("governanceBody", {
            link: (chunks) => (
              <Link href="/verification" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            )
          })}
        </p>
      </DocPanel>

      <DocPanel title={t("companionDocsTitle")}>
        <p>
          {t.rich("companionDocsBody", {
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
          })}{" "}
          {t("referenceImpl", { portalDomain, operatorName })}
        </p>
      </DocPanel>
    </DocPage>
  );
}
