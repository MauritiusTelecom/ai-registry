"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "../Icon";
import { Globe } from "./Globe";

type HeroFloatCardProps = {
  style: CSSProperties;
  title: string;
  subtitle?: string;
  dot?: string;
  delay?: number;
};

function HeroFloatCard({
  style,
  title,
  subtitle,
  dot = "#22d3ee",
  delay = 0
}: HeroFloatCardProps) {
  return (
    <div className="float-card" style={{ ...style, animationDelay: `${delay}s` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: dot,
            boxShadow: `0 0 8px ${dot}`
          }}
        />
        <span style={{ fontWeight: 500, letterSpacing: "0.02em" }}>{title}</span>
      </div>
      {subtitle && (
        <div style={{ marginTop: 4, color: "var(--text-3)", fontSize: 10.5 }}>{subtitle}</div>
      )}
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
          <svg
            width="21"
            height="14"
            viewBox="0 0 60 40"
            role="img"
            aria-label="Mauritius flag"
            style={{
              flexShrink: 0,
              borderRadius: 2,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
              display: "block"
            }}
          >
            <title>Mauritius</title>
            <rect x="0" y="0" width="60" height="10" fill="#EA2839" />
            <rect x="0" y="10" width="60" height="10" fill="#1A206D" />
            <rect x="0" y="20" width="60" height="10" fill="#FFD500" />
            <rect x="0" y="30" width="60" height="10" fill="#00A04D" />
          </svg>
          <span>v0.4 · airegistry.mu</span>
        </div>

        <h1 className="hero-title">
          Mauritius
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
            Explore Registry
            <Icon name="arrow-right" size={14} />
          </Link>
          <Link href="/ecosystem" className="btn btn-secondary">
            Discover Ecosystem
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

          <HeroFloatCard
            style={{ top: "4%", left: "-6%" }}
            title="claude-sonnet-4.5"
            subtitle="Verified · Anthropic · 12ms"
            dot="#10b981"
            delay={0}
          />
          <HeroFloatCard
            style={{ top: "32%", right: "-4%" }}
            title="mcp/treasury-ledger"
            subtitle="Trusted · Gov · air-gapped"
            dot="#a855f7"
            delay={1.2}
          />
          <HeroFloatCard
            style={{ bottom: "6%", left: "4%" }}
            title="agent.compliance-watch"
            subtitle="Active · Internal · 0 incidents"
            dot="#22d3ee"
            delay={2.4}
          />
        </div>
      </div>
    </section>
  );
}
