"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@airegistry/ui-kit";

export type RowMenuItem = {
  key: string;
  label: string;
  icon?: IconName;
  /** Visual tone — `danger` paints the label red. */
  tone?: "default" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * Admin · Row action kebab menu. Used in CRUD grids whenever a row carries
 * more than the standard View / Edit / Delete trio. The trigger is a
 * three-vertical-dots icon button styled like the other inline `r-card-action-link`
 * actions; the popover renders through a portal so it isn't clipped by row
 * containers, and closes on outside-click or Escape.
 *
 * Items render in order. Pass `tone: "danger"` for destructive actions
 * (Remove, Suspend, etc.).
 */
export function RowActionMenu({
  items,
  buttonLabel = "More actions",
  align = "right"
}: {
  items: RowMenuItem[];
  buttonLabel?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Mount-flag for SSR portal safety.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Recompute popover position whenever it opens or the window scrolls / resizes.
  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 220;
      const left =
        align === "right"
          ? Math.min(
              window.innerWidth - menuWidth - 8,
              rect.right + window.scrollX - menuWidth
            )
          : Math.max(8, rect.left + window.scrollX);
      const top = rect.bottom + window.scrollY + 6;
      setPos({ top, left });
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, align]);

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (
        menuRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="r-card-action-link"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={buttonLabel}
        title={buttonLabel}
        style={{
          padding: "4px 6px",
          // Make the trigger a touch wider so the dots feel like a button.
          minWidth: 28,
          justifyContent: "center",
          // The default `.r-card-action-link` color is `--text-3` (muted) —
          // the dots are small and read poorly at that intensity, so pin the
          // trigger to the full `--text` value in both states.
          color: "var(--text)"
        }}
      >
        <Icon name="more-vertical" size={16} />
      </button>

      {mounted && open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                width: 220,
                padding: 6,
                borderRadius: 10,
                // Solid panel — the popover floats over arbitrary page
                // content, so semi-transparent glass would bleed text and
                // controls through.
                background: "var(--panel-solid)",
                color: "var(--text)",
                border: "1px solid var(--border-strong)",
                boxShadow:
                  "0 12px 32px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.18)",
                zIndex: 1000,
                display: "grid",
                gap: 2,
                fontSize: 13
              }}
            >
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    if (it.disabled) return;
                    setOpen(false);
                    it.onSelect();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    color:
                      it.tone === "danger"
                        ? "#ef4444"
                        : "var(--text)",
                    textAlign: "left",
                    cursor: it.disabled ? "not-allowed" : "pointer",
                    opacity: it.disabled ? 0.5 : 1,
                    fontFamily: "inherit",
                    fontSize: 13
                  }}
                  onMouseEnter={(e) => {
                    if (it.disabled) return;
                    (e.currentTarget as HTMLButtonElement).style.background =
                      it.tone === "danger"
                        ? "rgba(239,68,68,0.10)"
                        : "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {it.icon ? <Icon name={it.icon} size={13} /> : <span style={{ width: 13 }} />}
                  <span>{it.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
