"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "../Icon";
import { Globe } from "./Globe";

type HeroEntityCardProps = {
  style: CSSProperties;
  kind: string;
  name: string;
  status: string;
  statusColor: string;
  provider: string;
  delay?: number;
};

function HeroEntityCard({
  style,
  kind,
  name,
  status,
  statusColor,
  provider,
  delay = 0
}: HeroEntityCardProps) {
  return (
    <div className="float-card" style={{ ...style, animationDelay: `${delay}s` }}>
      <div className="float-card-kind">{kind}</div>
      <div className="float-card-name">{name}</div>
      <div className="float-card-meta">
        <span className="float-card-status" style={{ color: statusColor }}>
          <span
            className="status-dot"
            style={{ background: "currentColor", width: 5, height: 5 }}
          />
          {status}
        </span>
        <span className="float-card-prov">· {provider}</span>
      </div>
    </div>
  );
}

export function Hero({ motionIntensity = 1 }: { motionIntensity?: number }) {
  return (
    <section className="hero">
      <div className="hero-overlay">
        <div className="grid-bg" />
      </div>

      <div className="hero-content">
        <div className="eyebrow">
          <span className="dot" />
          <span>v0.4 · airegistry.mu</span>
        </div>

        <h1 className="hero-title">
          The Sovereign
          <br />
          <span className="gradient-text">AI Registry.</span>
        </h1>

        <p className="hero-subtitle">
          Govern, orchestrate, and monitor trusted AI agents, models, and MCP infrastructure from a
          unified sovereign platform — built for nations, regulators, and the enterprises they
          depend on.
        </p>

        <div className="hero-cta-row">
          <Link href="/registry" className="btn btn-primary">
            Launch Registry
            <Icon name="arrow-right" size={14} />
          </Link>
          <Link href="/ecosystem" className="btn btn-secondary">
            Explore Ecosystem
          </Link>
        </div>

        <div className="hero-meta">
          <div className="hero-meta-item">
            <span className="status-dot" />
            All systems nominal
          </div>
          <div className="hero-meta-item" style={{ color: "var(--secondary)" }}>
            SOC 2 · ISO 27001 · FedRAMP High
          </div>
          <div className="hero-meta-item">build 2026.05.07-r3</div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="globe-stage">
          <Globe motionIntensity={motionIntensity} />

          <HeroEntityCard
            style={{ top: "2%", left: "-4%" }}
            kind="AI Agent"
            name="agent.compliance-watch"
            status="Active"
            statusColor="#10b981"
            provider="Internal"
            delay={0}
          />
          <HeroEntityCard
            style={{ top: "34%", right: "-6%" }}
            kind="AI Model"
            name="claude-sonnet-4.5"
            status="Verified"
            statusColor="var(--secondary)"
            provider="Anthropic"
            delay={1.5}
          />
          <HeroEntityCard
            style={{ bottom: "6%", left: "0%" }}
            kind="MCP Skill"
            name="mcp/treasury-ledger"
            status="Trusted"
            statusColor="var(--tertiary)"
            provider="Government"
            delay={3}
          />
        </div>
      </div>
    </section>
  );
}
