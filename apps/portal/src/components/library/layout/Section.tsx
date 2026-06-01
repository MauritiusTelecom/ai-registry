import type { CSSProperties, ReactNode } from "react";

/**
 * Minimal `<section className="section">` wrapper without the page-header
 * machinery. Use when a section has bespoke header content that
 * `PageSection`'s eyebrow/title/subtitle slots can't express, but you still
 * want the standard section padding and scroll-margin.
 *
 * Most callers should use `PageSection` instead.
 */
export function Section({
  children,
  id,
  scrollMarginTop = 120,
  className,
  style
}: {
  children: ReactNode;
  id?: string;
  scrollMarginTop?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      id={id}
      className={`section${className ? ` ${className}` : ""}`}
      style={{ scrollMarginTop, ...style }}
    >
      {children}
    </section>
  );
}
