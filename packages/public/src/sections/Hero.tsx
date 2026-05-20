"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type {
  PublicRegistryListResponse,
  RegistryCard,
  DisplayStatus
} from "@airegistry/sdk";
import { withBase } from "@airegistry/sdk";
import { Icon } from "@airegistry/ui-kit";
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

// ----- Hero float-card data plumbing -----

type FloatCardData = {
  title: string;
  subtitle: string;
  dot: string;
};

// Three fixed slots on the globe-stage. Data rotates; positions stay stable.
const CARD_SLOTS: CSSProperties[] = [
  { top: "4%", left: "-6%" },
  { top: "32%", right: "-4%" },
  { bottom: "6%", left: "4%" }
];

// Fallback shown before the fetch resolves, or if the API errors / returns
// zero rows. Keeps the existing Mauritius Telecom branding as a safe default.
const FALLBACK_CARDS: FloatCardData[] = [
  {
    title: "MytGPT Enterprise",
    subtitle: "Verified · Mauritius Telecom · Chat",
    dot: "#10b981"
  },
  {
    title: "my.t Vision AI",
    subtitle: "Verified · Mauritius Telecom · Vision",
    dot: "#a855f7"
  },
  {
    title: "my.t Document AI",
    subtitle: "Verified · Mauritius Telecom · OCR",
    dot: "#22d3ee"
  }
];

// Maps display-status badge -> dot colour. Mirrors the original hard-coded palette
// so the visual rhythm stays consistent regardless of which resources land here.
const STATUS_DOT: Record<DisplayStatus, string> = {
  verified: "#10b981",
  trusted: "#22d3ee",
  active: "#a855f7",
  experimental: "#f59e0b",
  isolated: "#ef4444"
};

// Strictly "listed" (lifecycle) only. `/api/resources` actually returns four
// public lifecycle codes - listed, needs_update, deprecated, suspended - so
// we trim client-side. The three allowed display badges below all map onto
// listed lifecycle:
//   verified -> listed + trust signals
//   trusted  -> listed + trust signals
//   active   -> listed (no trust signals)
//   experimental -> needs_update    (excluded)
//   isolated     -> suspended/deprecated (excluded)
const ALLOWED_STATUSES: DisplayStatus[] = ["verified", "trusted", "active"];

function statusLabel(s: DisplayStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cardToFloat(card: RegistryCard): FloatCardData {
  const status = card.status;
  const tail = card.context?.trim() || card.kind || "AI resource";
  return {
    title: card.title,
    subtitle: `${statusLabel(status)} · ${card.provider} · ${tail}`,
    dot: STATUS_DOT[status] ?? "#22d3ee"
  };
}

// Fisher-Yates shuffle on a copy.
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickThree(rows: RegistryCard[]): FloatCardData[] {
  const eligible = rows.filter((r) =>
    ALLOWED_STATUSES.includes(r.status as DisplayStatus)
  );
  if (eligible.length === 0) return FALLBACK_CARDS;
  const chosen = shuffle(eligible).slice(0, 3).map(cardToFloat);
  // Pad with fallback entries if the registry has fewer than 3 eligible rows.
  while (chosen.length < 3) chosen.push(FALLBACK_CARDS[chosen.length]);
  return chosen;
}

export function Hero({
  motionIntensity = 1,
  eyebrowText,
  eyebrowIconUrl
}: {
  motionIntensity?: number;
  /** Hero chip text. Falls back to "airegistry.mu" when undefined. */
  eyebrowText?: string;
  /** Optional custom icon for the hero chip. When set, replaces the Mauritius flag SVG. */
  eyebrowIconUrl?: string | null;
}) {
  const [cards, setCards] = useState<FloatCardData[]>(FALLBACK_CARDS);

  // Fetch once on mount. `cache: "no-store"` ensures every page load gets a
  // fresh sample - we want the three cards to rotate across visits.
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(withBase("/api/resources?limit=20"), {
          cache: "no-store",
          signal: ac.signal
        });
        if (!res.ok) return; // silent fallback - hero never surfaces API errors
        const data = (await res.json()) as PublicRegistryListResponse;
        if (Array.isArray(data.rows) && data.rows.length > 0) {
          setCards(pickThree(data.rows));
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        // Swallow - fallback cards stay rendered.
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <section className="hero">
      <div className="hero-overlay">
        <div className="grid-bg" />
      </div>

      <div className="hero-content">
        <div className="eyebrow">
          <span className="dot" />
          {eyebrowIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBase(eyebrowIconUrl)}
              alt=""
              width={21}
              height={14}
              style={{
                flexShrink: 0,
                borderRadius: 2,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                display: "block",
                objectFit: "cover"
              }}
            />
          ) : (
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
          )}
          <span>{eyebrowText ?? "airegistry.mu"}</span>
        </div>

        <h1 className="hero-title">
          Mauritius
          <br />
          <span className="gradient-text">AI Registry.</span>
        </h1>

        <p className="hero-subtitle">
          Govern, orchestrate, and monitor trusted AI agents, models, and MCP infrastructure from a
          unified sovereign platform - built for nations, regulators, and the enterprises they
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
      </div>

      <div className="hero-visual">
        <div className="globe-stage">
          <Globe motionIntensity={motionIntensity} />

          {cards.map((c, i) => (
            <HeroFloatCard
              key={`${c.title}-${i}`}
              style={CARD_SLOTS[i] ?? {}}
              title={c.title}
              subtitle={c.subtitle}
              dot={c.dot}
              delay={i * 1.2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
