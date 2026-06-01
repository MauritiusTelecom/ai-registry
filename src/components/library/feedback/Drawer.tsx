"use client";

import { useEffect, type ReactNode } from "react";
import { IconButton } from "../controls/IconButton";

/**
 * Right-edge sliding panel. Used for row-edit and detail views inside the
 * portal grids - heavier content than a Modal, lighter than navigating to
 * a full page.
 *
 * Behaviour:
 *   - Esc closes
 *   - Click on the backdrop closes
 *   - Body scroll locks while open
 *
 *   <Drawer open={editing !== null} onClose={() => setEditing(null)} title="Edit resource">
 *     <ResourceEditForm …/>
 *   </Drawer>
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 520,
  side = "right",
  children
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  width?: number;
  side?: "right" | "left";
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: side === "right" ? "flex-end" : "flex-start"
      }}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          height: "100vh",
          background: "var(--panel-solid, var(--panel))",
          borderLeft: side === "right" ? "1px solid var(--border)" : "none",
          borderRight: side === "left" ? "1px solid var(--border)" : "none",
          boxShadow: "var(--shadow-2)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden"
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div>
            {title ? (
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{subtitle}</div>
            ) : null}
          </div>
          <IconButton icon="x" aria-label="Close" onClick={onClose} />
        </header>
        <div style={{ overflowY: "auto", padding: 18 }}>{children}</div>
      </aside>
    </div>
  );
}
