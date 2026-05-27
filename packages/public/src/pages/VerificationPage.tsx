import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { DocPage, DocPanel } from "../sections/DocPage";
import { publicPageMetadata } from "../lib/page-metadata";

export async function generateMetadata() {
  return publicPageMetadata("Verification proofs");
}

export default async function VerificationPage() {
  const t = await getTranslations("verification");
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
      <DocPanel title={t("providerVerificationTitle")}>
        <p>
          <strong>{t("questionItAnswers")}</strong> {t("providerVerificationQuestion")}
        </p>
        <p style={{ marginTop: 10 }}>
          {t("values")}: <code>UNVERIFIED</code> · <code>VERIFIED</code> ·{" "}
          <code>OFFICIAL_PROVIDER</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          {t("providerVerificationNote")}
        </p>
      </DocPanel>

      <DocPanel title={t("sovereigntyReviewTitle")}>
        <p>
          <strong>{t("questionItAnswers")}</strong> {t("sovereigntyReviewQuestion")}
        </p>
        <p style={{ marginTop: 10 }}>
          {t("values")}: <code>NOT_REVIEWED</code> · <code>PENDING</code> · <code>PASSED</code> ·{" "}
          <code>FAILED</code> · <code>NOT_REQUIRED</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          {t.rich("sovereigntyReviewNote", {
            link: (chunks) => (
              <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
                {chunks}
              </Link>
            )
          })}
        </p>
      </DocPanel>

      <DocPanel title={t("officialResourceTitle")}>
        <p>
          <strong>{t("questionItAnswers")}</strong> {t("officialResourceQuestion")}
        </p>
        <p style={{ marginTop: 10 }}>
          {t("values")}: <code>NONE</code> · <code>PENDING</code> · <code>ENDORSED</code> ·{" "}
          <code>REVOKED</code>.
        </p>
        <p style={{ marginTop: 10, color: "var(--text-2)" }}>
          {t("officialResourceNote")}
        </p>
      </DocPanel>

      <DocPanel title={t("whyThreeTitle")}>
        <p>{t("whyThreeBody")}</p>
      </DocPanel>
    </DocPage>
  );
}
