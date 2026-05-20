"use client";

import Link from "next/link";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { Reveal } from "../shell/Reveal";
import { PageHero } from "@airegistry/ui-kit";
import { usePublicBranding } from "../lib/branding-context";

// ============================================================
// Section content - sourced from AI_Registry_Decision_Makers_Guide.html
// ============================================================

const LAYERS: { num: string; label: string; title: string; desc: string; meta: string }[] = [
  {
    num: "01",
    label: "Layer 01 · Discovery",
    title: "Registry Operator",
    desc: "Runs the public portal, discovery API and review workflow. Issues AIR-IDs and maintains the audit log.",
    meta: "Issues: air://air.mu/{type}/..."
  },
  {
    num: "02",
    label: "Layer 02 · Operations",
    title: "Provider",
    desc: "Owns the resource: endpoints, documentation, terms of access, version control. Remains fully responsible.",
    meta: "Owns: endpoint · ToS · versioning"
  },
  {
    num: "03",
    label: "Layer 03 · Workload",
    title: "Hosting Environment",
    desc: "Runs the actual workload - sovereign cloud, GPU, on-prem - and may issue runtime SVIDs via SPIFFE/SPIRE.",
    meta: "Provides: compute · runtime identity"
  }
];

const OPERATOR_PROFILES = [
  "National telcos",
  "Govt digital agencies",
  "Identity authorities",
  "Sovereign cloud operators",
  "Public-interest tech",
  "Standards bodies",
  "National CERTs"
];

const INTEGRATOR_ROLES: { icon: IconName; title: string; desc: string; tone: "primary" | "tertiary" | "secondary" | "emerald" }[] = [
  {
    icon: "flow",
    title: "Implementation & onboarding",
    desc: "Help providers prepare submissions, gather sovereignty evidence and integrate AIR-IDs into existing systems.",
    tone: "primary"
  },
  {
    icon: "edit",
    title: "Independent review",
    desc: "Supply reviewer capacity, subject-matter expertise and second-opinion checks for the sovereignty rubric.",
    tone: "tertiary"
  },
  {
    icon: "layers",
    title: "Custom build & extension",
    desc: "Extend AIR-Core for a jurisdiction - schema additions, sector configuration, federation tooling.",
    tone: "secondary"
  },
  {
    icon: "users",
    title: "Adoption & enablement",
    desc: "Train provider teams, run discovery workshops and embed the registry into national AI strategies.",
    tone: "emerald"
  }
];

const AUDIENCES: { icon: IconName; title: string; sub: string; points: string[] }[] = [
  {
    icon: "flag",
    title: "Governments & policy-makers",
    sub: "Sovereign AI strategy",
    points: [
      "A sovereign locus for AI discovery, distinct from global platforms and free of vendor lock-in.",
      "Practical instrument for national AI strategy: visible capabilities, named providers, transparent review.",
      "Foundation for DPI that complements identity, payments and data-exchange platforms."
    ]
  },
  {
    icon: "shield",
    title: "Industry & providers",
    sub: "Credible publication",
    points: [
      "A credible place to publish locally relevant AI resources to a known audience.",
      "Provider verification and official-resource status - signals trust without legal exposure.",
      "Standardised metadata that lets resources plug into AI systems, agents and integrations."
    ]
  },
  {
    icon: "cpu",
    title: "Developers & AI systems",
    sub: "Machine-readable discovery",
    points: [
      "Single, machine-readable place to discover sovereign AI by jurisdiction, capability or sovereignty basis.",
      "Stable identifiers (AIR-IDs) that survive provider rebrands or endpoint changes.",
      "Clear endpoint and protocol metadata: REST today, MCP and A2A as ecosystems mature."
    ]
  },
  {
    icon: "users",
    title: "Citizens & businesses",
    sub: "Local relevance, visible trust",
    points: [
      "AI systems that can find and use locally accurate tools - tax calculators, legal references, services.",
      "Visible governance signals that distinguish 'officially endorsed' from 'self-declared'.",
      "A sovereign alternative to opaque global directories where local relevance is invisible."
    ]
  }
];

const FEDERATION_PRINCIPLES = [
  {
    label: "Principle 01",
    title: "Bilateral & explicit",
    desc: "Registries federate by deliberate agreement; no automatic or transitive trust."
  },
  {
    label: "Principle 02",
    title: "Metadata first",
    desc: "Discovery references - not shared databases or runtime access."
  },
  {
    label: "Principle 03",
    title: "Runtime identity external",
    desc: "Hosting providers may bind workloads to AIR-IDs via SPIFFE/SPIRE - outside registry scope."
  },
  {
    label: "Principle 04",
    title: "Sovereignty preserved",
    desc: "Each registry remains independently operated, governed and populated."
  }
];

const TRACKS: { num: string; title: string; desc: string; cta?: string; href?: string; featured: boolean }[] = [
  {
    num: "Track 01",
    title: "Adopt",
    desc: "Stand up a national or municipal AI Registry using the open-source AIR-Core platform with your own configuration.",
    cta: "Deploy AIR-Core",
    href: "https://github.com/MauritiusTelecom/ai-registry",
    featured: true
  },
  {
    num: "Track 02",
    title: "Contribute",
    desc: "Improve the open-source codebase, propose schema changes, share country-specific configuration or sovereignty rubrics.",
    cta: "Open a PR",
    href: "https://github.com/MauritiusTelecom/ai-registry/pulls",
    featured: false
  },
  {
    num: "Track 03",
    title: "Partner",
    desc: "Co-publish governance models, federation agreements, or shared reviewer rosters with peer registries.",
    cta: "Start a conversation",
    href: "/contact",
    featured: false
  },
  {
    num: "Track 04",
    title: "Observe",
    desc: "Track this registry, study the operating model, and decide if and how to deploy in your context.",
    featured: false
  }
];

const NAV_ITEMS = [
  { id: "platform", label: "The AI Registry" },
  { id: "operators", label: "Operators" },
  { id: "integrators", label: "Integrators" },
  { id: "audiences", label: "Audiences" },
  { id: "federation", label: "Federation" },
  { id: "engage", label: "Engage" }
];

// ============================================================
// Sub-sections
// ============================================================

function AnchorNav() {
  return (
    <div
      style={{
        position: "sticky",
        top: 64,
        zIndex: 5,
        padding: "12px 0",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        background:
          "linear-gradient(180deg, rgba(var(--bg-rgb, 10,10,12), 0.85) 0%, rgba(var(--bg-rgb, 10,10,12), 0.65) 100%)",
        borderBottom: "1px solid var(--hairline)"
      }}
    >
      <div className="page" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "center",
            padding: "6px 8px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "rgba(var(--primary-rgb), 0.04)"
          }}
        >
          {NAV_ITEMS.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                color: "var(--text-2)",
                textDecoration: "none",
                fontWeight: 500,
                letterSpacing: "0.01em",
                transition: "color 160ms, background 160ms"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(var(--primary-rgb), 0.10)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {n.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThePlatform() {
  return (
    <section className="section" id="platform" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>The AI Registry</span>
        </div>
        <h2>
          A small, focused idea:{" "}
          <span className="gradient-text">a registry that points.</span>
        </h2>
        <p>
          The AI Registry separates three things that other platforms collapse.
          Discovery, provider operations, and hosting - each operated by a different
          party. The registry is only the first layer, and it is never on the runtime path.
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16
          }}
        >
          {LAYERS.map((layer) => (
            <div
              key={layer.num}
              className="feature-card"
              style={{
                position: "relative",
                padding: 22,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  background: "var(--grad-text)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  marginBottom: 8
                }}
              >
                {layer.num}
              </div>
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-2)",
                  marginBottom: 10
                }}
              >
                {layer.label}
              </div>
              <h4
                style={{
                  fontSize: 17,
                  fontWeight: 500,
                  margin: "0 0 8px",
                  letterSpacing: "-0.01em"
                }}
              >
                {layer.title}
              </h4>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text-2)",
                  lineHeight: 1.55,
                  margin: "0 0 14px"
                }}
              >
                {layer.desc}
              </p>
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                  color: "var(--text-2)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(var(--primary-rgb), 0.06)",
                  border: "1px solid var(--border)"
                }}
              >
                {layer.meta}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div
          style={{
            marginTop: 24,
            padding: "16px 22px",
            borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background:
              "linear-gradient(90deg, rgba(var(--primary-rgb),0.08), rgba(var(--tertiary-rgb),0.08))",
            textAlign: "center",
            color: "var(--text-2)",
            fontSize: 14
          }}
        >
          <strong style={{ color: "var(--text)" }}>The registry points.</strong>{" "}
          &nbsp;The provider operates.&nbsp; The hosting environment secures.
        </div>
      </Reveal>
    </section>
  );
}

function WhoRunsIt() {
  const { operatorName, portalDomain } = usePublicBranding();
  const portalUrl = `https://${portalDomain}`;
  return (
    <section className="section" id="operators" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>Who runs it</span>
        </div>
        <h2>
          Built for <span className="gradient-text">DPI enablers.</span>
        </h2>
        <p>
          Best operated by organisations that already run trusted, neutral,
          national-scale digital services on behalf of broader ecosystems - the
          legitimacy, capability and convening power matter as much as the technology.{" "}
          <strong style={{ color: "var(--text)" }}>
            {operatorName} operates the reference instance at{" "}
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)", textDecoration: "none" }}
            >
              {portalDomain}
            </a>
            .
          </strong>
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          <div
            className="feature-card"
            style={{
              padding: 24,
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background:
                "radial-gradient(300px 200px at 0% 0%, rgba(var(--secondary-rgb),0.10), transparent 60%), var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--secondary-rgb), 0.12)",
                color: "var(--secondary)",
                border: "1px solid rgba(var(--secondary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="check" size={18} stroke={1.8} />
            </div>
            <h4 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 500 }}>
              What makes a DPI enabler
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-2)",
                fontSize: 14,
                lineHeight: 1.6,
                display: "grid",
                gap: 8
              }}
            >
              <li>Trusted to operate critical digital infrastructure for many parties, not just for themselves.</li>
              <li>Already integrated with government, industry and developer ecosystems.</li>
              <li>Comfortable with standards, interconnection and long-lived public services.</li>
              <li>Predictable governance and operational continuity over years, not project cycles.</li>
            </ul>
          </div>

          <div
            className="feature-card"
            style={{
              padding: 24,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="users" size={18} stroke={1.8} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 500 }}>
              Natural operator profiles
            </h4>
            <p style={{ color: "var(--text-2)", fontSize: 13.5, margin: "0 0 14px" }}>
              In any given country, one or two organisations typically stand out.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {OPERATOR_PROFILES.map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: 12.5,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(var(--primary-rgb), 0.08)",
                    border: "1px solid var(--border)",
                    color: "var(--text)"
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          <div
            className="feature-card"
            style={{
              padding: 22,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--primary-rgb), 0.12)",
                color: "var(--primary)",
                border: "1px solid rgba(var(--primary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="layers" size={18} stroke={1.8} />
            </div>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              Telcos - operator
            </h5>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
              National infrastructure, enterprise ecosystems, interconnection, deep
              government relationships, hosting adjacency and sovereign-cloud ambitions
              - though hosting AI remains separate from operating the registry.
            </p>
          </div>

          <div
            className="feature-card"
            style={{
              padding: 22,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel)"
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "rgba(var(--tertiary-rgb), 0.12)",
                color: "var(--tertiary)",
                border: "1px solid rgba(var(--tertiary-rgb), 0.30)",
                marginBottom: 12
              }}
            >
              <Icon name="shield" size={18} stroke={1.8} />
            </div>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              Government - policy sponsor
            </h5>
            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
              The most resilient model is a partnership: government provides policy
              legitimacy and sector convening; the operator (telco or other DPI
              enabler) provides platform operations and technical implementation.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Integrators() {
  const tones: Record<string, { rgb: string; color: string }> = {
    primary: { rgb: "var(--primary-rgb)", color: "var(--primary)" },
    tertiary: { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
    secondary: { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
    emerald: { rgb: "16, 185, 129", color: "#10b981" }
  };

  return (
    <section className="section" id="integrators" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>Integration partners</span>
        </div>
        <h2>
          The connective tissue - <span className="gradient-text">Integrators.</span>
        </h2>
        <p>
          Registry, providers, hosting and identity are the operating layers. Integrators
          are the connective tissue - the system integrators, advisories, reviewer pools
          and specialists who help providers publish, jurisdictions deploy and ecosystems
          mature.
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14
          }}
        >
          {INTEGRATOR_ROLES.map((r) => {
            const tone = tones[r.tone];
            return (
              <div
                key={r.title}
                className="feature-card"
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel)"
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: `rgba(${tone.rgb}, 0.12)`,
                    color: tone.color,
                    border: `1px solid rgba(${tone.rgb}, 0.30)`,
                    marginBottom: 12
                  }}
                >
                  <Icon name={r.icon} size={18} stroke={1.8} />
                </div>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--text)"
                  }}
                >
                  {r.title}
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.55
                  }}
                >
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function ForWhom() {
  return (
    <section className="section" id="audiences" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>For whom</span>
        </div>
        <h2>
          Value at <span className="gradient-text">every layer of the ecosystem.</span>
        </h2>
        <p>Small in scope, broad in impact. Here&rsquo;s what changes for each audience.</p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}
        >
          {AUDIENCES.map((a, idx) => {
            const tones = [
              { rgb: "var(--primary-rgb)", color: "var(--primary)" },
              { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" },
              { rgb: "var(--secondary-rgb)", color: "var(--secondary)" },
              { rgb: "16, 185, 129", color: "#10b981" }
            ];
            const tone = tones[idx % tones.length];
            return (
              <div
                key={a.title}
                className="feature-card"
                style={{
                  padding: 22,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: `rgba(${tone.rgb}, 0.12)`,
                      color: tone.color,
                      border: `1px solid rgba(${tone.rgb}, 0.30)`,
                      flexShrink: 0
                    }}
                  >
                    <Icon name={a.icon} size={20} stroke={1.8} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{a.title}</h4>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-2)",
                        fontFamily: "IBM Plex Mono, monospace",
                        letterSpacing: "0.04em"
                      }}
                    >
                      {a.sub}
                    </div>
                  </div>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    display: "grid",
                    gap: 8
                  }}
                >
                  {a.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function LongTermVision() {
  const { registryName } = usePublicBranding();
  return (
    <section className="section" id="federation" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>The long-term vision</span>
        </div>
        <h2>
          Federation - <span className="gradient-text">trust without merging.</span>
        </h2>
        <p>
          No country&rsquo;s AI ecosystem exists in isolation. Federation lets registries
          trust each other&rsquo;s metadata <em>without merging</em>. Each side keeps its
          sovereignty rubric, status labels and audit trail. Not an MVP requirement -
          but the registry is designed so it doesn&rsquo;t preclude federation later.
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            flexWrap: "wrap",
            padding: "26px 18px",
            borderRadius: 16,
            border: "1px solid var(--border-strong)",
            background:
              "radial-gradient(420px 240px at 50% 0%, rgba(var(--primary-rgb),0.10), transparent 60%), var(--panel)",
            marginBottom: 22
          }}
        >
          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 14,
                color: "var(--text)",
                marginBottom: 4
              }}
            >
              air://air.mu
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>{registryName}</div>
          </div>

          <div
            style={{
              flex: "1 1 200px",
              maxWidth: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8
            }}
          >
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-2)"
              }}
            >
              Bilateral · Metadata-only
            </div>
            <div
              style={{
                width: "100%",
                height: 2,
                borderRadius: 2,
                background:
                  "linear-gradient(90deg, rgba(var(--primary-rgb),0.6), rgba(var(--tertiary-rgb),0.6))"
              }}
            />
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-2)"
              }}
            >
              Sovereignty preserved
            </div>
          </div>

          <div style={{ textAlign: "center", minWidth: 180 }}>
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 14,
                color: "var(--text)",
                marginBottom: 4,
                display: "inline-flex",
                alignItems: "baseline",
                gap: 0
              }}
            >
              <span>air://air.</span>
              <span
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(var(--tertiary-rgb), 0.18)",
                  border: "1px solid rgba(var(--tertiary-rgb), 0.35)",
                  color: "var(--tertiary)",
                  letterSpacing: "0.04em",
                  marginLeft: 4
                }}
              >
                peer
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Peer Registry</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14
          }}
        >
          {FEDERATION_PRINCIPLES.map((fp) => (
            <div
              key={fp.label}
              className="feature-card"
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--panel)"
              }}
            >
              <div
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-2)",
                  marginBottom: 8
                }}
              >
                {fp.label}
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>{fp.title}</h4>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
                {fp.desc}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function GetInvolved() {
  const { operatorName, portalDomain, openSourceRepoUrl } = usePublicBranding();
  const tracks = [
    { ...TRACKS[0]!, href: openSourceRepoUrl },
    { ...TRACKS[1]!, href: `${openSourceRepoUrl.replace(/\/$/, "")}/pulls` },
    TRACKS[2]!,
    {
      ...TRACKS[3]!,
      desc: `Track ${portalDomain}, study the operating model, and decide if and how to deploy in your context.`
    }
  ];
  return (
    <section className="section" id="engage" style={{ scrollMarginTop: 120 }}>
      <Reveal className="section-header">
        <div className="eyebrow">
          <span className="dot" />
          <span>Get involved</span>
        </div>
        <h2>
          Four ways to engage. <span className="gradient-text">Pick yours.</span>
        </h2>
        <p>
          Intentionally small, open and sovereign. The value comes from <em>restraint</em>
          {" "}- and from others deploying and governing their own. {operatorName} is
          building the reference; the next steps are adoption, contribution and partnership.
        </p>
      </Reveal>

      <Reveal>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16
          }}
        >
          {tracks.map((t) => {
            const hasHref = Boolean(t.href);
            const isExternal = hasHref && t.href!.startsWith("http");
            const LinkEl: React.ElementType = hasHref ? (isExternal ? "a" : Link) : "div";
            return (
              <LinkEl
                key={t.num}
                {...(hasHref ? { href: t.href } : {})}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="feature-card"
                style={{
                  position: "relative",
                  padding: 22,
                  borderRadius: 14,
                  border: t.featured
                    ? "1px solid rgba(var(--primary-rgb), 0.40)"
                    : "1px solid var(--border)",
                  background: t.featured
                    ? "linear-gradient(160deg, rgba(var(--primary-rgb), 0.10), var(--panel))"
                    : "var(--panel)",
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  transition: "transform 220ms cubic-bezier(.2,.8,.2,1), border-color 220ms"
                }}
              >
                <div
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: t.featured ? "var(--primary)" : "var(--text-2)",
                    marginBottom: 10
                  }}
                >
                  {t.num}
                </div>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    ...(t.featured
                      ? {
                          background: "var(--grad-text)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent"
                        }
                      : { color: "var(--text)" })
                  }}
                >
                  {t.title}
                </h4>
                <p
                  style={{
                    margin: "0 0 14px",
                    color: "var(--text-2)",
                    fontSize: 13.5,
                    lineHeight: 1.55
                  }}
                >
                  {t.desc}
                </p>
                {t.cta ? (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: t.featured ? "var(--primary)" : "var(--text)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    {t.cta}
                    <span aria-hidden>&rarr;</span>
                  </div>
                ) : null}
              </LinkEl>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="section">
      <Reveal>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "48px 32px",
            borderRadius: 20,
            border: "1px solid var(--border-strong)",
            background:
              "radial-gradient(600px 320px at 50% 0%, rgba(var(--primary-rgb),0.18), transparent 60%), radial-gradient(600px 320px at 100% 100%, rgba(var(--tertiary-rgb),0.14), transparent 60%), var(--panel)",
            textAlign: "center"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.2
            }}
          >
            Build the{" "}
            <span className="gradient-text">sovereign discovery layer</span>
            <br />
            for your country.
          </h2>
          <p
            style={{
              maxWidth: 580,
              margin: "16px auto 28px",
              color: "var(--text-2)",
              fontSize: 15,
              lineHeight: 1.55
            }}
          >
            Open code. Local control. Sovereign discovery. Reach out for a private
            preview, a partnership discussion or a technical walk-through.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center"
            }}
          >
            <Link
              href="/contact"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 10,
                background: "var(--grad-accent)",
                color: "#fff",
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(var(--primary-rgb), 0.40)"
              }}
            >
              Talk to the team
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ============================================================
// Page
// ============================================================

export function EcosystemContent() {
  return (
    <div>
      <PageHero
        crumb="Ecosystem · Partners & Operators"
        title={
          <>
            An ecosystem of <span className="gradient-text">independent stakeholders</span>.
          </>
        }
        subtitle="The AI Registry, the operators who run it, the integrators who connect it, the audiences it serves, and the path to federation - independent parties held together only by open standards and stable identifiers."
      />

      <AnchorNav />

      <ThePlatform />
      <WhoRunsIt />
      <Integrators />
      <ForWhom />
      <LongTermVision />
      <GetInvolved />

      <ClosingCta />
    </div>
  );
}
