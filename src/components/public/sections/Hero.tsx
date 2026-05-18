"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Button, Gradient, Reveal } from "@/components/library";
import type { PublicRegistryListResponse, RegistryCard } from "@/lib/discovery/types";
import { withBase } from "@/lib/with-base";
import { Globe } from "./Globe";

type ShowcaseCard = { title: string; subtitle: string; dot: string };

const FALLBACK: ShowcaseCard[] = [
  { title: "MytGPT Enterprise", subtitle: "Verified · Mauritius Telecom", dot: "#10b981" },
  { title: "my.t Vision AI", subtitle: "Verified · Mauritius Telecom", dot: "#a855f7" },
  { title: "my.t Document AI", subtitle: "Verified · Mauritius Telecom", dot: "#22d3ee" }
];

const CARD_POS: (CSSProperties & { delay: string })[] = [
  { top: "10%", left: "4%", delay: "0s" },
  { top: "36%", right: "0%", delay: "2.4s" },
  { bottom: "14%", left: "12%", delay: "4.8s" }
];

const LISTED = new Set(["verified", "trusted", "active"]);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toCard(row: RegistryCard, i: number): ShowcaseCard {
  return {
    title: row.title,
    subtitle: `${statusLabel(row.status)} · ${row.provider}`,
    dot: FALLBACK[i % FALLBACK.length].dot
  };
}

function pickShowcase(rows: RegistryCard[]): ShowcaseCard[] {
  const eligible = rows.filter((r) => LISTED.has(r.status));
  if (!eligible.length) return FALLBACK;
  const picked = shuffle(eligible)
    .slice(0, 3)
    .map((row, i) => toCard(row, i));
  while (picked.length < 3) picked.push(FALLBACK[picked.length]);
  return picked;
}

function MauritiusFlag() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden style={{ borderRadius: 2 }}>
      <rect width="16" height="11" fill="#EA2839" />
      <rect width="16" height="3.67" y="3.67" fill="#1A206D" />
      <rect width="16" height="3.66" y="7.34" fill="#FFD500" />
      <rect width="5" height="11" fill="#1A206D" />
    </svg>
  );
}

function FloatCard({ card, style }: { card: ShowcaseCard; style: CSSProperties }) {
  return (
    <div className="float-card" style={style}>
      <div className="float-card-name">{card.title}</div>
      <div className="float-card-meta">
        <div className="float-card-status">
          <span
            className="status-dot"
            style={{ background: card.dot, boxShadow: `0 0 6px ${card.dot}` }}
          />
          {card.subtitle}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const [cards, setCards] = useState<ShowcaseCard[]>(FALLBACK);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(withBase("/api/resources?limit=20"), {
          cache: "no-store",
          signal: ac.signal
        });
        if (!res.ok) return;
        const data = (await res.json()) as PublicRegistryListResponse;
        if (Array.isArray(data.rows) && data.rows.length) {
          setCards(pickShowcase(data.rows));
        }
      } catch {
        /* fallbacks */
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <section className="hero">
      <div className="hero-overlay" aria-hidden />
      <Reveal className="hero-content">
        <div className="eyebrow">
          <span className="dot" />
          <MauritiusFlag />
          <span>airegistry.mu</span>
        </div>
        <h1 className="hero-title">
          Mauritius
          <br />
          <Gradient>AI Registry.</Gradient>
        </h1>
        <p className="hero-subtitle">
          Govern, orchestrate, and monitor trusted AI agents, models, and MCP infrastructure from a
          unified sovereign platform - built for nations, regulators, and the enterprises they depend
          on.
        </p>
        <div className="hero-cta-row">
          <Button href="/registry" intent="primary" trailingIcon="arrow-right">
            Explore Registry
          </Button>
          <Button href="/ecosystem" intent="secondary">
            Discover Ecosystem
          </Button>
        </div>
      </Reveal>

      <Reveal className="hero-visual" delay={100}>
        <Globe>
          {cards.map((card, i) => {
            const { delay, ...pos } = CARD_POS[i];
            return (
              <FloatCard
                key={`${card.title}-${i}`}
                card={card}
                style={{ ...pos, animationDelay: delay }}
              />
            );
          })}
        </Globe>
      </Reveal>
    </section>
  );
}
