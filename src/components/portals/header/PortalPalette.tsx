"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/public/Icon";

/**
 * Accent-palette switcher — mirrors the prototype's 4-palette dropdown. The
 * selection mutates the `--primary-rgb`, `--secondary-rgb`, `--tertiary-rgb`
 * (and matching `--primary` / `--secondary` / `--tertiary`) CSS variables on
 * `<html>` and persists the index in localStorage so the choice survives a
 * reload. Production deploys can lock this UI behind a flag — but for the
 * provider portal we keep it open since every operator may want their own
 * palette.
 */

type Palette = {
  id: number;
  label: string;
  primary: string; // RGB triple
  secondary: string;
  tertiary: string;
};

const PALETTES: Palette[] = [
  { id: 0, label: "Sovereign", primary: "59,130,246", secondary: "6,182,212", tertiary: "168,85,247" },
  { id: 1, label: "Pacific", primary: "20,184,166", secondary: "52,211,153", tertiary: "14,165,233" },
  { id: 2, label: "Coral", primary: "236,72,153", secondary: "244,114,182", tertiary: "168,85,247" },
  { id: 3, label: "Solar", primary: "245,158,11", secondary: "251,191,36", tertiary: "239,68,68" }
];

const STORAGE_KEY = "air-pal";

function applyPalette(p: Palette) {
  if (typeof document === "undefined") return;
  const r = document.documentElement.style;
  r.setProperty("--primary-rgb", p.primary);
  r.setProperty("--secondary-rgb", p.secondary);
  r.setProperty("--tertiary-rgb", p.tertiary);
  r.setProperty("--primary", `rgb(${p.primary})`);
  r.setProperty("--secondary", `rgb(${p.secondary})`);
  r.setProperty("--tertiary", `rgb(${p.tertiary})`);
}

export function PortalPalette() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState<number>(0);
  const ref = useRef<HTMLDivElement | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const stored = parseInt(window.localStorage.getItem(STORAGE_KEY) ?? "0", 10);
      const safe = Number.isFinite(stored) && stored >= 0 && stored < PALETTES.length ? stored : 0;
      setIdx(safe);
      applyPalette(PALETTES[safe]);
    } catch {
      // private mode — silently ignore.
    }
  }, []);

  // Click-away + Esc close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function pick(i: number) {
    setIdx(i);
    applyPalette(PALETTES[i]);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(i));
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="p-icon-btn-wrap">
      <button
        type="button"
        className="p-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Accent palette"
      >
        <Icon name="palette" size={15} />
      </button>
      {open ? (
        <div className="p-dropdown" style={{ width: 220 }}>
          <div className="p-dropdown-head">
            <div className="p-dropdown-title">Accent palette</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              padding: 6
            }}
          >
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`p-pal-swatch ${idx === p.id ? "active" : ""}`}
                onClick={() => pick(p.id)}
              >
                <span
                  className="p-pal-bar"
                  style={{
                    background: `linear-gradient(13deg, rgb(${p.primary}), rgb(${p.tertiary}))`
                  }}
                />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
