import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";

const PILLARS: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "shield",
    title: "Provider Verification",
    desc: "Domain-bound DNS and email proofs confirm that listed providers are who they claim to be."
  },
  {
    icon: "flag",
    title: "Sovereignty Review",
    desc: "Each resource cites local law, data, systems, language or culture - and is reviewed against a published rubric."
  },
  {
    icon: "lock",
    title: "Runtime Identity",
    desc: "Optional SPIFFE/SPIRE SVIDs from the hosting environment - issued by the operator, never the registry."
  },
  {
    icon: "doc",
    title: "Open Audit Log",
    desc: "Status changes, reviewer notes and AIR-ID assignments are signed and publicly auditable."
  }
];

const TEST_ROWS: { label: string; body: string }[] = [
  {
    label: "Local law",
    body: "Encodes legislation, regulation, official process or professional obligation."
  },
  {
    label: "Local data",
    body: "Uses local datasets, records or locally collected knowledge."
  },
  {
    label: "Local systems",
    body: "Integrates with or describes local institutional systems and workflows."
  },
  {
    label: "Language & culture",
    body: "Supports local language, culture, norms or context."
  }
];

export function GovernanceSection() {
  return (
    <section className="section">
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>Governance, not Gatekeeping</span>
        </div>
        <h2>
          Listing is not endorsement.
          <br />
          <span className="gradient-text">Three independent signals do the work.</span>
        </h2>
        <p>
          The registry exposes lightweight governance metadata so users can tell apart &ldquo;this
          resource exists&rdquo; from &ldquo;an authorised body has officially endorsed it.&rdquo;
          Status labels are explicit and auditable.
        </p>
      </Reveal>

      <div className="gov-grid">
        <Reveal>
          <div className="gov-pillars">
            {PILLARS.map((pillar) => (
              <div className="pillar feature-card" key={pillar.title}>
                <div className="pillar-icon">
                  <Icon name={pillar.icon} size={16} />
                </div>
                <div className="pillar-title">{pillar.title}</div>
                <div className="pillar-desc">{pillar.desc}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="trust-chain-panel">
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                color: "var(--text-3)",
                letterSpacing: "0.14em",
                textTransform: "uppercase"
              }}
            >
              Sovereignty Test
            </div>
            <h3 style={{ marginTop: 12 }}>Specific, not aspirational.</h3>
            <p style={{ marginTop: 10, fontSize: 14 }}>
              To qualify, a submission must cite at least one sovereignty basis with concrete
              evidence - a referenced law, dataset, institution, language asset or cultural
              artefact.
            </p>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {TEST_ROWS.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: "1px dashed var(--border)"
                  }}
                >
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 11,
                      color: "var(--secondary)",
                      minWidth: 140,
                      paddingTop: 1,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase"
                    }}
                  >
                    {row.label}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-2)", flex: 1 }}>{row.body}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: 18,
                fontSize: 12,
                fontFamily: "IBM Plex Mono, monospace",
                color: "var(--text-3)"
              }}
            >
              Quality matters more than quantity. A registry of fifty credible resources is more
              useful than one of a thousand generic listings.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
