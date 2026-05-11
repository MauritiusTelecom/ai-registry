import { Reveal } from "../Reveal";
import { PageHero } from "./PageHero";

const PARTNERS = [
  {
    tier: "Sovereign Operators",
    items: [
      "Government of Mauritius",
      "Ministry of Finance",
      "Mauritius Revenue Authority",
      "Bank of Mauritius",
      "EDB Mauritius"
    ]
  },
  {
    tier: "Model Providers",
    items: [
      "Anthropic",
      "OpenAI",
      "Meta · Llama",
      "Mistral AI",
      "University of Mauritius (Kreol LLM)"
    ]
  },
  {
    tier: "Hosting & Identity",
    items: [
      "Sovereign Cloud MU",
      "Public GPU Co-op",
      "On-prem operators",
      "SPIFFE/SPIRE federation"
    ]
  },
  {
    tier: "Integration Partners",
    items: ["Accenture", "Deloitte Sovereign", "Local SI Network", "Independent reviewers"]
  }
];

export function EcosystemContent() {
  return (
    <div>
      <PageHero
        crumb="Ecosystem · Partners & Operators"
        title={
          <>
            An ecosystem, <span className="gradient-text">not a platform</span>.
          </>
        }
        subtitle="Five layers of independent operators - registry, providers, hosting, identity and integrators - held together only by open standards and stable identifiers."
      />
      <section className="section">
        <div style={{ display: "grid", gap: 32 }}>
          {PARTNERS.map((tier, index) => (
            <Reveal key={tier.tier} delay={index * 60}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
                  <div className="eyebrow">
                    <span className="dot" />
                    <span>{tier.tier}</span>
                  </div>
                  <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 12
                  }}
                >
                  {tier.items.map((name) => (
                    <div
                      key={name}
                      className="glass"
                      style={{ padding: "20px 18px", display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: "var(--grad-accent)",
                          flexShrink: 0,
                          opacity: 0.8
                        }}
                      />
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
