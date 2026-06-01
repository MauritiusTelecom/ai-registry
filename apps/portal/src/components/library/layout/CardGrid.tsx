import type { CSSProperties, ReactNode } from "react";

/**
 * Auto-fit responsive grid. Wraps
 *
 *   <div style={{
 *     display: 'grid',
 *     gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
 *     gap
 *   }}>
 *
 * which the marketing sections repeat ~7 times. The grid items stretch to
 * fill their row and wrap onto the next when the viewport narrows past
 * `min` × column-count.
 *
 *   <CardGrid min={260} gap={16}>
 *     {items.map(i => <FeatureCard key={i.id} {...i} />)}
 *   </CardGrid>
 */
export function CardGrid({
  children,
  min = 260,
  gap = 16,
  marginTop,
  style
}: {
  children: ReactNode;
  /** Min column width in px. Below this the column wraps. */
  min?: number;
  /** Gap between cards in px. */
  gap?: number;
  /** Optional top margin — useful when stacking grids in the same section. */
  marginTop?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
        gap,
        marginTop,
        ...style
      }}
    >
      {children}
    </div>
  );
}
