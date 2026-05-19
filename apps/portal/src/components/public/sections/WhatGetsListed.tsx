import Link from "next/link";
import {
  PageSection,
  Reveal,
  Icon,
  Gradient,
  type IconName
} from "@/components/library";

type ResourceKind = "model" | "agent" | "skill";

type TypeEntry = {
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  sample: string;
  kind: ResourceKind;
  accent: { rgb: string; color: string };
};

const TYPES: TypeEntry[] = [
  {
    icon: "doc",
    eyebrow: "Type · Model",
    title: "Models",
    description:
      "Language, vision or domain models trained on or aware of local context, language and norms.",
    sample: "model/mu-llm/kreol-1",
    kind: "model",
    accent: { rgb: "var(--primary-rgb)", color: "var(--primary)" }
  },
  {
    icon: "agent",
    eyebrow: "Type · Agent",
    title: "Agents",
    description:
      "Autonomous workflows that act on local processes - registrations, filings, public-service navigation.",
    sample: "agent/mu-agent/service-finder",
    kind: "agent",
    accent: { rgb: "var(--tertiary-rgb)", color: "var(--tertiary)" }
  },
  {
    icon: "shield",
    eyebrow: "Type · Skill",
    title: "Skills",
    description:
      "Packaged expertise - tax legal accounting workflows - ready to plug into agents.",
    sample: "skill/mu-skill/fiscaliste-mu",
    kind: "skill",
    accent: { rgb: "16, 185, 129", color: "#10b981" }
  }
];

function TypeCard({ entry, index }: { entry: TypeEntry; index: number }) {
  const { rgb, color } = entry.accent;
  return (
    <Reveal delay={80 + index * 40}>
      <Link
        href={`/registry?kind=${entry.kind}`}
        className="feature-card type-card"
        style={{
          position: "relative",
          padding: 26,
          borderRadius: 18,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          overflow: "hidden",
          textDecoration: "none",
          color: "inherit",
          display: "block"
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: "-40% auto auto -20%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${rgb}, 0.18), transparent 70%)`,
            pointerEvents: "none"
          }}
        />
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(13deg, rgba(${rgb}, 0.22), rgba(${rgb}, 0.08))`,
            border: `1px solid rgba(${rgb}, 0.35)`,
            color,
            marginBottom: 18
          }}
        >
          <Icon name={entry.icon} size={24} stroke={1.8} />
        </span>
        <p
          style={{
            margin: "0 0 8px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-3)"
          }}
        >
          {entry.eyebrow}
        </p>
        <h3 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>
          {entry.title}
        </h3>
        <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, lineHeight: 1.55 }}>
          {entry.description}
        </p>
        <p
          style={{
            marginTop: 20,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11.5,
            color,
            letterSpacing: "0.04em"
          }}
        >
          {entry.sample}
        </p>
      </Link>
    </Reveal>
  );
}

export function WhatGetsListed() {
  return (
    <PageSection
      eyebrow="What gets listed"
      title={
        <>
          Three resource types. <Gradient>Composable by AI.</Gradient>
        </>
      }
      subtitle="The registry covers three kinds of sovereign AI resource - models, agents and skills. Each has its own listing template and stable AIR-ID, so consumers and AI systems can find and combine them programmatically."
    >
      <section className="types-grid" aria-label="Resource types">
        {TYPES.map((entry, index) => (
          <TypeCard key={entry.kind} entry={entry} index={index} />
        ))}
      </section>
    </PageSection>
  );
}
