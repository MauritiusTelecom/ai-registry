import Link from "next/link";
import { Reveal } from "../Reveal";
import { PageHero } from "./PageHero";

const sectionStyle: React.CSSProperties = {
  paddingTop: 32,
  paddingBottom: 32,
  scrollMarginTop: 96
};
const panelStyle: React.CSSProperties = {
  padding: 28,
  fontSize: 15,
  lineHeight: 1.7
};
const headingStyle: React.CSSProperties = { marginBottom: 12 };

export function GovernancePageContent() {
  return (
    <div>
      <PageHero
        crumb="Governance · Charter & Review"
        title={
          <>
            Governance <span className="gradient-text">without overreach</span>.
          </>
        }
        subtitle="The discipline of the registry is in what it refuses to do. Many adjacent capabilities are reasonable; each one would make the registry a different kind of platform."
      />

      <section className="section" id="charter" style={sectionStyle}>
        <h2 style={headingStyle}>Charter</h2>
        <div className="gov-grid" style={{ gap: 32 }}>
          <Reveal>
            <div className="glass" style={{ padding: 28 }}>
              <h3>What it is</h3>
              <ul
                style={{
                  marginTop: 14,
                  paddingLeft: 18,
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.65
                }}
              >
                <li>A locally-governed catalogue of sovereign AI resources.</li>
                <li>
                  Stable identifiers under{" "}
                  <span className="mono" style={{ color: "var(--text)" }}>air://</span>.
                </li>
                <li>
                  Three independent governance signals: provider-verified, sovereignty-reviewed,
                  official-resource.
                </li>
                <li>An open, append-only audit log.</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass" style={{ padding: 28 }}>
              <h3>What it is not</h3>
              <ul
                style={{
                  marginTop: 14,
                  paddingLeft: 18,
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.65
                }}
              >
                <li>A runtime, gateway or proxy.</li>
                <li>A certification authority. (Listing ≠ endorsement.)</li>
                <li>A marketplace or payment layer.</li>
                <li>A hosting provider for any AI resource.</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="review-board" style={sectionStyle}>
        <h2 style={headingStyle}>Review board</h2>
        <div className="glass" style={panelStyle}>
          <p>
            Reviewers apply the published{" "}
            <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
              sovereignty rubric
            </Link>{" "}
            to elevate or reject submissions. The board is composed of named reviewers
            drawn from the operator, sector experts and (where applicable) official
            authorities. Decisions are public; reviewer notes appear on the resource
            detail page; every decision is timestamped against the rubric version applied
            at the time.
          </p>
          <p style={{ marginTop: 14 }}>
            Reviewers do not act on resources from their own organisation. Conflicts of
            interest are recorded under{" "}
            <a href="#disclosure" style={{ color: "var(--text-2)" }}>
              disclosure
            </a>
            .
          </p>
        </div>
      </section>

      <section className="section" id="appeals" style={sectionStyle}>
        <h2 style={headingStyle}>Appeals</h2>
        <div className="glass" style={panelStyle}>
          <p>
            If a resource was rejected, deprecated or removed and the provider believes
            the decision was wrong, the appeal path is:
          </p>
          <ol style={{ paddingLeft: 22, marginTop: 12, display: "grid", gap: 8 }}>
            <li>
              Submit an appeal through{" "}
              <Link href="/contact" style={{ color: "var(--text-2)" }}>
                the contact form
              </Link>{" "}
              with the AIR-ID and a short statement of why the original decision should
              be re-examined.
            </li>
            <li>
              The operator routes the appeal to a reviewer who was not involved in the
              original decision.
            </li>
            <li>
              The reviewer publishes a re-examination outcome with reasoning. The
              outcome is appended to the audit log alongside the original decision.
            </li>
          </ol>
          <p style={{ marginTop: 14 }}>
            Appeals are not a route to bypass the{" "}
            <Link href="/sovereignty-rubric" style={{ color: "var(--text-2)" }}>
              sovereignty rubric
            </Link>
            ; they are a route to test that it was applied correctly.
          </p>
        </div>
      </section>

      <section className="section" id="disclosure" style={sectionStyle}>
        <h2 style={headingStyle}>Disclosure</h2>
        <div className="glass" style={panelStyle}>
          <p>
            The operator (Mauritius Telecom for airegistry.mu) commits to disclose:
          </p>
          <ul style={{ paddingLeft: 22, marginTop: 12, display: "grid", gap: 8 }}>
            <li>Funding and operating sponsors of the registry instance.</li>
            <li>
              Any resources or providers in which the operator has an ownership or
              hosting relationship.
            </li>
            <li>
              Reviewer roster and any standing conflicts of interest declared by
              individual reviewers.
            </li>
            <li>Material changes to the rubric, schema or APIs.</li>
          </ul>
          <p style={{ marginTop: 14 }}>
            All disclosure events are recorded in the{" "}
            <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
              audit log
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="section" id="public-log" style={sectionStyle}>
        <h2 style={headingStyle}>Public log</h2>
        <div className="glass" style={panelStyle}>
          <p>
            Every state-changing action — AIR-ID issuance, sovereignty review,
            official-resource endorsement, lifecycle transition — is recorded in an
            append-only{" "}
            <Link href="/audit-log" style={{ color: "var(--text-2)" }}>
              audit log
            </Link>
            . The log behind a removed resource is preserved indefinitely so the
            governance trail remains traceable.
          </p>
        </div>
      </section>
    </div>
  );
}
