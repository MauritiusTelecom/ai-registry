"use client";

import { useState } from "react";
import { Icon } from "@/components/library";

/**
 * Copy-to-clipboard pill for an AIR-ID. Used on the resource detail page so
 * integrators can grab the canonical identifier without manual selection.
 */
export function AirIdCopy({ airId }: { airId: string }) {
  const [copied, setCopied] = useState(false);
  async function onClick() {
    try {
      await navigator.clipboard.writeText(airId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fall back to
      // a no-op - the visible AIR-ID can still be selected manually.
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Copy AIR-ID"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "var(--code-bg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 12.5,
        color: "var(--text-2)",
        cursor: "pointer",
        wordBreak: "break-all",
        textAlign: "left"
      }}
    >
      <span style={{ flex: 1 }}>{airId}</span>
      <Icon name={copied ? "check" : "doc"} size={12} />
      <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
