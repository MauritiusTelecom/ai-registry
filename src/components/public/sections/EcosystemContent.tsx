"use client";

import {
  PageSection,
  Section,
  CardGrid,
  CalloutBanner,
  CtaPanel,
  Card,
  FeatureCard,
  IconTile,
  EyebrowLabel,
  Chip,
  ChipList,
  Gradient,
  Button,
  Reveal,
  AnchorNav,
  type IconName,
  type Tone
} from "@/components/library";
import { PageHero } from "./PageHero";

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

const INTEGRATOR_ROLES: { icon: IconName; title: string; desc: string; tone: Tone }[] = [
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
    desc: "Track airegistry.mu, study the operating model, and decide if and how to deploy in your context.",
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

// Tone cycle used to colour the audience cards in `ForWhom`.
const AUDIENCE_TONES: Tone[] = ["primary", "tertiary", "secondary", "emerald"];

// ============================================================
// Sub-sections
// ============================================================

function ThePlatform() {
  return (
    <PageSection
      id="platform"
      eyebrow="The AI Registry"
      title={
        <>
          A small, focused idea: <Gradient>a registry that points.</Gradient>
        </>
      }
      subtitle="The AI Registry separates three things that other platforms collapse. Discovery, provider operations, and hosting - each operated by a different party. The registry is only the first layer, and it is never on the runtime path."
    >
      <Reveal>
        <CardGrid min={260} gap={16}>
          {LAYERS.map((layer) => (
            <FeatureCard key={layer.num} meta={layer.meta} padding={22}>
              {/* Bespoke: the large gradient stratum number is unique to this section. */}
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
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
              <EyebrowLabel marginBottom={10}>{layer.label}</EyebrowLabel>
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
                  margin: 0
                }}
              >
                {layer.desc}
              </p>
            </FeatureCard>
          ))}
        </CardGrid>
      </Reveal>

      <Reveal>
        <CalloutBanner intent="accent" marginTop={24}>
          <strong style={{ color: "var(--text)" }}>The registry points.</strong>
          &nbsp;&nbsp;The provider operates.&nbsp; The hosting environment secures.
        </CalloutBanner>
      </Reveal>
    </PageSection>
  );
}

function WhoRunsIt() {
  return (
    <PageSection
      id="operators"
      eyebrow="Who runs it"
      title={<>Built for <Gradient>DPI enablers.</Gradient></>}
      subtitle={
        <>
          Best operated by organisations that already run trusted, neutral,
          national-scale digital services on behalf of broader ecosystems - the
          legitimacy, capability and convening power matter as much as the technology.{" "}
          <strong style={{ color: "var(--text)" }}>
            Mauritius Telecom operates the reference instance at{" "}
            <a
              href="https://airegistry.mu"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)", textDecoration: "none" }}
            >
              airegistry.mu
            </a>
            .
          </strong>
        </>
      }
    >
      <Reveal>
        <CardGrid min={280} gap={16}>
          {/* First card - radial-gradient background, bullet list. */}
          <FeatureCard
            icon="check"
            tone="secondary"
            borderStrong
            background="radial-gradient(300px 200px at 0% 0%, rgba(var(--secondary-rgb),0.10), transparent 60%), var(--panel)"
            padding={24}
          >
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
          </FeatureCard>

          {/* Second card - chip cloud. */}
          <FeatureCard icon="users" tone="emerald" padding={24}>
            <h4 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 500 }}>
              Natural operator profiles
            </h4>
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 13.5,
                margin: "0 0 14px"
              }}
            >
              In any given country, one or two organisations typically stand out.
            </p>
            <ChipList>
              {OPERATOR_PROFILES.map((p) => (
                <Chip key={p}>{p}</Chip>
              ))}
            </ChipList>
          </FeatureCard>
        </CardGrid>
      </Reveal>

      <Reveal>
        <CardGrid min={280} gap={16} marginTop={18}>
          <FeatureCard icon="layers" tone="primary" padding={22}>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              Telcos - operator
            </h5>
            <p
              style={{
                margin: 0,
                color: "var(--text-2)",
                fontSize: 13.5,
                lineHeight: 1.55
              }}
            >
              National infrastructure, enterprise ecosystems, interconnection, deep
              government relationships, hosting adjacency and sovereign-cloud ambitions
              - though hosting AI remains separate from operating the registry.
            </p>
          </FeatureCard>

          <FeatureCard icon="shield" tone="tertiary" padding={22}>
            <h5 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500 }}>
              Government - policy sponsor
            </h5>
            <p
              style={{
                margin: 0,
                color: "var(--text-2)",
                fontSize: 13.5,
                lineHeight: 1.55
              }}
            >
              The most resilient model is a partnership: government provides policy
              legitimacy and sector convening; the operator (telco or other DPI
              enabler) provides platform operations and technical implementation.
            </p>
          </FeatureCard>
        </CardGrid>
      </Reveal>
    </PageSection>
  );
}

function Integrators() {
  return (
    <PageSection
      id="integrators"
      eyebrow="Integration partners"
      title={<>The connective tissue - <Gradient>Integrators.</Gradient></>}
      subtitle="Registry, providers, hosting and identity are the operating layers. Integrators are the connective tissue - the system integrators, advisories, reviewer pools and specialists who help providers publish, jurisdictions deploy and ecosystems mature."
    >
      <Reveal>
        <CardGrid min={240} gap={14}>
          {INTEGRATOR_ROLES.map((r) => (
            <FeatureCard
              key={r.title}
              icon={r.icon}
              tone={r.tone}
              padding={20}
            >
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
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
            </FeatureCard>
          ))}
        </CardGrid>
      </Reveal>
    </PageSection>
  );
}

function ForWhom() {
  return (
    <PageSection
      id="audiences"
      eyebrow="For whom"
      title={<>Value at <Gradient>every layer of the ecosystem.</Gradient></>}
      subtitle={<>Small in scope, broad in impact. Here&rsquo;s what changes for each audience.</>}
    >
      <Reveal>
        <CardGrid min={280} gap={16}>
          {AUDIENCES.map((a, idx) => {
            const tone = AUDIENCE_TONES[idx % AUDIENCE_TONES.length];
            return (
              <Card key={a.title} padding={22}>
                {/* Horizontal icon + title + subtitle header - this layout
                    doesn't fit FeatureCard's vertical icon stacking, so we
                    use bare Card + IconTile and compose by hand. */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14
                  }}
                >
                  <IconTile name={a.icon} tone={tone} size={40} marginBottom={0} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{a.title}</h4>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-2)",
                        fontFamily: "'IBM Plex Mono', monospace",
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
              </Card>
            );
          })}
        </CardGrid>
      </Reveal>
    </PageSection>
  );
}

function LongTermVision() {
  return (
    <PageSection
      id="federation"
      eyebrow="The long-term vision"
      title={<>Federation - <Gradient>trust without merging.</Gradient></>}
      subtitle={
        <>
          No country&rsquo;s AI ecosystem exists in isolation. Federation lets registries
          trust each other&rsquo;s metadata <em>without merging</em>. Each side keeps its
          sovereignty rubric, status labels and audit trail. Not an MVP requirement -
          but the registry is designed so it doesn&rsquo;t preclude federation later.
        </>
      }
    >
      <Reveal>
        {/* Bespoke: the air://air.mu ↔ air://air.peer federation diagram is a
            one-off visual; intentionally not absorbed into a library primitive. */}
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
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                color: "var(--text)",
                marginBottom: 4
              }}
            >
              air://air.mu
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Mauritius Registry</div>
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
                fontFamily: "'IBM Plex Mono', monospace",
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
                fontFamily: "'IBM Plex Mono', monospace",
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
                fontFamily: "'IBM Plex Mono', monospace",
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
                  fontFamily: "'IBM Plex Mono', monospace",
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

        <CardGrid min={220} gap={14}>
          {FEDERATION_PRINCIPLES.map((fp) => (
            <FeatureCard
              key={fp.label}
              eyebrow={fp.label}
              title={fp.title}
              body={fp.desc}
              padding={18}
            />
          ))}
        </CardGrid>
      </Reveal>
    </PageSection>
  );
}

function GetInvolved() {
  return (
    <PageSection
      id="engage"
      eyebrow="Get involved"
      title={<>Four ways to engage. <Gradient>Pick yours.</Gradient></>}
      subtitle={
        <>
          Intentionally small, open and sovereign. The value comes from <em>restraint</em>
          {" "}- and from others deploying and governing their own. Mauritius Telecom is
          building the reference; the next steps are adoption, contribution and partnership.
        </>
      }
    >
      <Reveal>
        <CardGrid min={240} gap={16}>
          {TRACKS.map((t) => (
            <FeatureCard
              key={t.num}
              eyebrow={t.num}
              title={t.title}
              body={t.desc}
              ctaLabel={t.cta}
              featured={t.featured}
              href={t.href}
              padding={22}
            />
          ))}
        </CardGrid>
      </Reveal>
    </PageSection>
  );
}

function ClosingCta() {
  return (
    <Section>
      <Reveal>
        <CtaPanel
          title={
            <>
              Build the <Gradient>sovereign discovery layer</Gradient>
              <br />
              for your country.
            </>
          }
          body="Open code. Local control. Sovereign discovery. Reach out for a private preview, a partnership discussion or a technical walk-through."
          actions={
            <Button href="/contact" intent="primary" trailingIcon="arrow-right">
              Talk to the team
            </Button>
          }
        />
      </Reveal>
    </Section>
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
            An ecosystem of <Gradient>independent stakeholders</Gradient>.
          </>
        }
        subtitle="The AI Registry, the operators who run it, the integrators who connect it, the audiences it serves, and the path to federation - independent parties held together only by open standards and stable identifiers."
      />

      <AnchorNav items={NAV_ITEMS} />

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
