import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "../motion/Reveal";

/**
 * Standard public-site page band. Wraps the
 *
 *   <section className="section" id="..." style={{ scrollMarginTop }}>
 *     <Reveal className="section-header">
 *       <div className="eyebrow"><span className="dot" /><span>{eyebrow}</span></div>
 *       <h2>{title}</h2>
 *       <p>{subtitle}</p>
 *     </Reveal>
 *     {children}
 *   </section>
 *
 * scaffold that every section component in `components/public/sections/`
 * re-rolls. Pass `title` as a ReactNode so you can inject `<Gradient>`
 * spans where the marketing copy emphasises a phrase.
 *
 *   <PageSection
 *     id="platform"
 *     eyebrow="The AI Registry"
 *     title={<>A small, focused idea: <Gradient>a registry that points.</Gradient></>}
 *     subtitle="The AI Registry separates three things that other platforms collapse."
 *   >
 *     <CardGrid min={260}>…</CardGrid>
 *   </PageSection>
 */
export function PageSection({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  scrollMarginTop = 120,
  className,
  style
}: {
  id?: string;
  /** Short label shown in the pill above the heading. Omit to skip the
   *  whole section-header block (header-less section). */
  eyebrow?: ReactNode;
  /** Heading content. Renders as `<h2>`. */
  title?: ReactNode;
  /** Lead paragraph below the heading. */
  subtitle?: ReactNode;
  children?: ReactNode;
  scrollMarginTop?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const hasHeader = eyebrow || title || subtitle;
  return (
    <section
      className={`section${className ? ` ${className}` : ""}`}
      id={id}
      style={{ scrollMarginTop, ...style }}
    >
      {hasHeader ? (
        <Reveal className="section-header">
          {eyebrow ? (
            <div className="eyebrow">
              <span className="dot" />
              <span>{eyebrow}</span>
            </div>
          ) : null}
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </Reveal>
      ) : null}
      {children}
    </section>
  );
}
