/**
 * Renders in slot `public.home.hero.below` when PLUGINS_ENABLED is on.
 */
export function HeroBelowSlot() {
  return (
    <section
      className="registry-extension-hello"
      data-plugin="hello"
      aria-label="Example extension"
      style={{
        margin: "1.5rem auto",
        maxWidth: "48rem",
        padding: "0.75rem 1rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--sar-border, #334155)",
        background: "var(--sar-surface-2, rgba(15, 23, 42, 0.6))",
        fontSize: "0.875rem",
        color: "var(--sar-text-muted, #94a3b8)"
      }}
    >
      Example extension active: <strong>hello</strong> (slot{" "}
      <code>public.home.hero.below</code>). Try{" "}
      <a href="/api/ext/hello/ping" style={{ color: "var(--sar-accent, #38bdf8)" }}>
        /api/ext/hello/ping
      </a>
      .
    </section>
  );
}

export default HeroBelowSlot;
