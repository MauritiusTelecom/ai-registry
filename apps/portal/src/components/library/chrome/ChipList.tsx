import type { ReactNode } from "react";

/**
 * Horizontal flex-wrap container for a row of `<Chip>` entries. Avoids
 * repeating the `display: flex; flex-wrap: wrap; gap: 8` triple in every
 * caller.
 */
export function ChipList({
  children,
  gap = 8
}: {
  children: ReactNode;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap }}>
      {children}
    </div>
  );
}
