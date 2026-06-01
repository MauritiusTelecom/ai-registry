"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Density = "compact" | "balanced" | "spacious";

type Palette = {
  primary: string;
  secondary: string;
  tertiary: string;
  /** Optional 4th stop. When present, --grad-text / --grad-accent become a 4-stop gradient (primary→secondary→tertiary→quaternary) instead of the default primary→tertiary. */
  quaternary?: string;
  label: string;
};

const PALETTES: Palette[] = [
  { primary: "59,130,246", secondary: "6,182,212", tertiary: "168,85,247", label: "Sovereign" },
  { primary: "20,184,166", secondary: "52,211,153", tertiary: "14,165,233", label: "Pacific" },
  { primary: "236,72,153", secondary: "244,114,182", tertiary: "168,85,247", label: "Coral" },
  { primary: "245,158,11", secondary: "251,191,36", tertiary: "239,68,68", label: "Solar" },
  // Kigali: blue primary; yellow tertiary so --grad-text / --grad-accent (primary→tertiary) balance blue and yellow. Sky = secondary.
  { primary: "0,161,222", secondary: "79,195,247", tertiary: "250,210,1", label: "Kigali" },
  // Mauritius: full 4-stop flag gradient (red → blue → yellow → green). Quaternary unlocks a 4-stop --grad-text / --grad-accent override.
  { primary: "234,40,57", secondary: "26,79,163", tertiary: "255,213,0", quaternary: "0,165,81", label: "Mauritius" }
];

function applyPalette(idx: number) {
  const p = PALETTES[idx] ?? PALETTES[0];
  const root = document.documentElement.style;
  root.setProperty("--primary-rgb", p.primary);
  root.setProperty("--secondary-rgb", p.secondary);
  root.setProperty("--tertiary-rgb", p.tertiary);
  root.setProperty("--primary", `rgb(${p.primary})`);
  root.setProperty("--secondary", `rgb(${p.secondary})`);
  root.setProperty("--tertiary", `rgb(${p.tertiary})`);

  if (p.quaternary) {
    // 4-stop palette: extend gradient vars across all flag colors.
    root.setProperty("--quaternary-rgb", p.quaternary);
    root.setProperty("--quaternary", `rgb(${p.quaternary})`);
    const stops = `rgb(${p.primary}) 0%, rgb(${p.secondary}) 34%, rgb(${p.tertiary}) 66%, rgb(${p.quaternary}) 100%`;
    root.setProperty("--grad-text", `linear-gradient(90deg, ${stops})`);
    root.setProperty("--grad-accent", `linear-gradient(90deg, ${stops})`);
    root.setProperty(
      "--grad-border",
      `linear-gradient(90deg, rgba(${p.primary},0.7), rgba(${p.secondary},0.7), rgba(${p.tertiary},0.7), rgba(${p.quaternary},0.7))`
    );
  } else {
    // Fall back to the default 2-stop gradients defined in globals.css.
    root.removeProperty("--quaternary-rgb");
    root.removeProperty("--quaternary");
    root.removeProperty("--grad-text");
    root.removeProperty("--grad-accent");
    root.removeProperty("--grad-border");
  }
}

function applyDensity(d: Density) {
  const pad = d === "compact" ? "80px" : d === "spacious" ? "160px" : "120px";
  document.documentElement.style.setProperty("--section-pad", pad);
}

/**
 * Dev-only design tools - palette / motion / density.
 * Mirrors `tweaks-panel.jsx` from the prototype but only mounts in development.
 */
export function TweaksPanel() {
  const t = useTranslations("tweaks");
  const [palette, setPalette] = useState(0);
  const [density, setDensity] = useState<Density>("compact");

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);
  useEffect(() => {
    applyDensity(density);
  }, [density]);

  return (
    <aside className="tweaks-panel" aria-label={t("title")}>
      <div className="tweaks-panel-title">{t("title")}</div>

      <div className="tweaks-section">
        <div className="tweaks-section-label">{t("palette")}</div>
        <div className="tweaks-options">
          {PALETTES.map((p, idx) => (
            <button
              key={p.label}
              type="button"
              className={idx === palette ? "active" : ""}
              onClick={() => setPalette(idx)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-section-label">{t("density")}</div>
        <div className="tweaks-options">
          {(["compact", "balanced", "spacious"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={d === density ? "active" : ""}
              onClick={() => setDensity(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
