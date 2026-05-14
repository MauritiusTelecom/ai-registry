"use client";

import { useState, type ReactNode } from "react";

/**
 * Minimal hover tooltip. Wraps a single child and surfaces the `content`
 * on hover / focus. For long-form rich popovers, prefer a dedicated
 * Popover primitive (not built yet); this is for short labels.
 *
 *   <Tooltip content="Open the resource detail">
 *     <IconButton icon="eye" aria-label="View" />
 *   </Tooltip>
 */
export function Tooltip({
  content,
  side = "top",
  children
}: {
  content: ReactNode;
  side?: "top" | "bottom";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            [side === "top" ? "bottom" : "top"]: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--panel-strong, var(--panel-solid))",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11.5,
            whiteSpace: "nowrap",
            boxShadow: "var(--shadow-1)",
            pointerEvents: "none",
            zIndex: 100
          }}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
