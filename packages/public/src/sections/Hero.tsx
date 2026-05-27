"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePublicBranding } from "../lib/branding-context";
import type {
  PublicRegistryListResponse,
  RegistryCard,
  DisplayStatus
} from "@airegistry/sdk";
import { withBase } from "@airegistry/sdk";
import { useTranslations } from "next-intl";
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

function buildFallbackCards(
  operatorName: string,
  t: ReturnType<typeof useTranslations<"hero">>
): FloatCardData[] {
  return [
    {
      title: t("fallbackCard1Title"),
      subtitle: `${t("verified")} · ${operatorName} · ${t("fallbackCard1Subtitle")}`,
      dot: "#10b981"
    },
    {
      title: t("fallbackCard2Title"),
      subtitle: `${t("verified")} · ${operatorName} · ${t("fallbackCard2Subtitle")}`,
      dot: "#a855f7"
    },
    {
      title: t("fallbackCard3Title"),
      subtitle: `${t("verified")} · ${operatorName} · ${t("fallbackCard3Subtitle")}`,
      dot: "#22d3ee"
    }
  ];
}

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

function cardToFloat(card: RegistryCard, fallbackKindLabel: string): FloatCardData {
  const status = card.status;
  const tail = card.context?.trim() || card.kind || fallbackKindLabel;
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

function pickThree(rows: RegistryCard[], fallback: FloatCardData[], fallbackKindLabel: string): FloatCardData[] {
  const eligible = rows.filter((r) =>
    ALLOWED_STATUSES.includes(r.status as DisplayStatus)
  );
  if (eligible.length === 0) return fallback;
  const chosen = shuffle(eligible).slice(0, 3).map((c) => cardToFloat(c, fallbackKindLabel));
  while (chosen.length < 3) chosen.push(fallback[chosen.length]!);
  return chosen;
}

export function Hero({
  motionIntensity = 1,
  eyebrowText,
  eyebrowIconUrl
}: {
  motionIntensity?: number;
  /** Hero chip text. Falls back to portal domain from branding when undefined. */
  eyebrowText?: string;
  /** Optional custom icon for the hero chip. When set, replaces the Mauritius flag SVG. */
  eyebrowIconUrl?: string | null;
}) {
  const {
    operatorName,
    jurisdictionDisplayName,
    heroHeadlineAccent,
    portalDomain
  } = usePublicBranding();
  const t = useTranslations("hero");
  const fallbackCards = useMemo(() => buildFallbackCards(operatorName, t), [operatorName, t]);
  const [cards, setCards] = useState<FloatCardData[]>(fallbackCards);

  useEffect(() => {
    setCards(fallbackCards);
  }, [fallbackCards]);

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
          setCards(pickThree(data.rows, fallbackCards, t("fallbackAiResource")));
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        // Swallow - fallback cards stay rendered.
      }
    })();
    return () => ac.abort();
  }, [fallbackCards, t]);

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
              <title>{jurisdictionDisplayName}</title>
              <rect x="0" y="0" width="60" height="10" fill="#EA2839" />
              <rect x="0" y="10" width="60" height="10" fill="#1A206D" />
              <rect x="0" y="20" width="60" height="10" fill="#FFD500" />
              <rect x="0" y="30" width="60" height="10" fill="#00A04D" />
            </svg>
          )}
          <span>{eyebrowText ?? portalDomain}</span>
        </div>

        <h1 className="hero-title">
          {jurisdictionDisplayName}
          <br />
          <span className="gradient-text">{heroHeadlineAccent}</span>
        </h1>

        <p className="hero-subtitle">
          {t("subtitle")}
        </p>

        <div className="hero-cta-row">
          <Link href="/registry" className="btn btn-primary">
            {t("exploreRegistry")}
            <Icon name="arrow-right" size={14} />
          </Link>
          <Link href="/ecosystem" className="btn btn-secondary">
            {t("discoverEcosystem")}
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
