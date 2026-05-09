"use client";

import { useEffect, useState } from "react";

type Density = "compact" | "balanced" | "spacious";

type Palette = {
  primary: string;
  secondary: string;
  tertiary: string;
  label: string;
};

const PALETTES: Palette[] = [
  { primary: "59,130,246", secondary: "6,182,212", tertiary: "168,85,247", label: "Sovereign" },
  { primary: "20,184,166", secondary: "52,211,153", tertiary: "14,165,233", label: "Pacific" },
  { primary: "236,72,153", secondary: "244,114,182", tertiary: "168,85,247", label: "Coral" },
  { primary: "245,158,11", secondary: "251,191,36", tertiary: "239,68,68", label: "Solar" }
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
}

function applyDensity(d: Density) {
  const pad = d === "compact" ? "80px" : d === "spacious" ? "160px" : "120px";
  document.documentElement.style.setProperty("--section-pad", pad);
}

/**
 * Dev-only design tools — palette / motion / density.
 * Mirrors `tweaks-panel.jsx` from the prototype but only mounts in development.
 */
export function TweaksPanel() {
  const [palette, setPalette] = useState(0);
  const [density, setDensity] = useState<Density>("compact");

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);
  useEffect(() => {
    applyDensity(density);
  }, [density]);

  return (
    <aside className="tweaks-panel" aria-label="Design tweaks (dev only)">
      <div className="tweaks-panel-title">Tweaks · dev</div>

      <div className="tweaks-section">
        <div className="tweaks-section-label">Palette</div>
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
        <div className="tweaks-section-label">Density</div>
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
