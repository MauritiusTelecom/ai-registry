import type { ReactNode } from "react";

/**
 * Inline gradient text span. Replaces the bare
 * `<span className="gradient-text">...</span>` pattern from `globals.css`.
 * Behaves like any inline element; pass it as a child of a heading or
 * paragraph.
 *
 *   <h2>A registry that <Gradient>points.</Gradient></h2>
 */
export function Gradient({ children }: { children: ReactNode }) {
  return <span className="gradient-text">{children}</span>;
}
