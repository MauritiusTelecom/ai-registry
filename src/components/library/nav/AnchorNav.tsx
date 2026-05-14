"use client";

/**
 * Sticky pill nav with in-page anchor links - the row of "platform / operators /
 * integrators / …" buttons used at the top of long marketing pages.
 *
 *   <AnchorNav items={[
 *     { id: 'platform',  label: 'The AI Registry' },
 *     { id: 'operators', label: 'Operators' },
 *     …
 *   ]} />
 *
 * Each item scrolls to `#{id}` on click. Hover and active treatment uses
 * inline handlers because the styling is small enough that promoting it
 * to a class isn't worth the cognitive load.
 */

export type AnchorItem = { id: string; label: string };

export function AnchorNav({
  items,
  top = 64
}: {
  items: AnchorItem[];
  /** Pixel offset from the viewport top when stuck. Default 64 = SiteShell topnav height. */
  top?: number;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top,
        zIndex: 5,
        padding: "12px 0",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        background:
          "linear-gradient(180deg, rgba(var(--bg-rgb, 10,10,12), 0.85) 0%, rgba(var(--bg-rgb, 10,10,12), 0.65) 100%)",
        borderBottom: "1px solid var(--hairline, var(--border))"
      }}
    >
      <div className="page" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "center",
            padding: "6px 8px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "rgba(var(--primary-rgb), 0.04)"
          }}
        >
          {items.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                color: "var(--text-2)",
                textDecoration: "none",
                fontWeight: 500,
                letterSpacing: "0.01em",
                transition: "color 160ms, background 160ms"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "rgba(var(--primary-rgb), 0.10)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-2)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {n.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
