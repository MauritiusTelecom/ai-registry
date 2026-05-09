import { Reveal } from "../Reveal";
import { PageHero } from "./PageHero";

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
      <section className="section">
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
    </div>
  );
}
