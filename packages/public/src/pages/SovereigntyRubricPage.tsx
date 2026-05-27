import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Sovereignty rubric");
}

export default async function SovereigntyRubricPage() {
  const t = await getTranslations("sovereigntyRubric");

  const BASES = [
    {
      code: "LAW",
      name: t("lawName"),
      meaning: t("lawMeaning"),
      evidence: t("lawEvidence")
    },
    {
      code: "DATA",
      name: t("dataName"),
      meaning: t("dataMeaning"),
      evidence: t("dataEvidence")
    },
    {
      code: "SYSTEMS",
      name: t("systemsName"),
      meaning: t("systemsMeaning"),
      evidence: t("systemsEvidence")
    },
    {
      code: "LANGUAGE_CULTURE",
      name: t("languageCultureName"),
      meaning: t("languageCultureMeaning"),
      evidence: t("languageCultureEvidence")
    }
  ];

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
      <DocPanel title={t("fourBasesTitle")}>
        <div style={{ display: "grid", gap: 16 }}>
          {BASES.map((b) => (
            <div
              key={b.code}
              style={{
                paddingBottom: 14,
                borderBottom: "1px dashed var(--hairline)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap"
                }}
              >
                <span className="tag">{b.code}</span>
                <strong style={{ fontSize: 16 }}>{b.name}</strong>
              </div>
              <p style={{ marginTop: 8 }}>{b.meaning}</p>
              <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--text-3)" }}>
                <strong style={{ color: "var(--text-2)" }}>{t("evidenceLabel")}:</strong> {b.evidence}
              </p>
            </div>
          ))}
        </div>
      </DocPanel>

      <DocPanel title={t("howClaimReviewedTitle")}>
        <p>{t("howClaimReviewedBody")}</p>
      </DocPanel>

      <DocPanel title={t("whereFitsTitle")}>
        <p>
          {t.rich("whereFitsBody", {
            verificationLink: (chunks) => (
              <Link href="/verification" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            ),
            docsLink: (chunks) => (
              <Link href="/docs" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            )
          })}
        </p>
      </DocPanel>
    </DocPage>
  );
}
