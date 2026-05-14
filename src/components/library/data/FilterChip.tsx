"use client";

import type { ReactNode } from "react";

/**
 * Compact select rendered as a chip-style control. Used in grid toolbars.
 * `value === undefined` means "All". Three forms via prop variants:
 *
 *   - `bool`   - tri-state (true / false / all), passes `boolean | undefined`
 *   - `select` - pick one from a list, passes `string | undefined`
 *
 * The implementation here covers the `select` form (the most common); the
 * `bool` form is identical except for the options. Keep them in one
 * primitive to avoid two near-duplicates.
 *
 *   <FilterChip
 *     label="Kind"
 *     value={kind}
 *     options={[{ value: 'model', label: 'Model' }, …]}
 *     onChange={setKind}
 *   />
 */

export type FilterOption = { value: string; label: ReactNode };

export function FilterChip({
  label,
  value,
  options,
  onChange,
  allLabel = "All"
}: {
  label: ReactNode;
  value: string | undefined;
  options: FilterOption[];
  onChange: (next: string | undefined) => void;
  allLabel?: ReactNode;
}) {
  return (
    <label
      className="p-grid-filter"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        color: "var(--text-2)"
      }}
    >
      <span className="p-grid-filter-label" style={{ whiteSpace: "nowrap" }}>
        {label}:
      </span>
      <select
        className="p-input p-select"
        value={value ?? "__all"}
        onChange={(e) =>
          onChange(e.target.value === "__all" ? undefined : e.target.value)
        }
        style={{ height: 30, fontSize: 12, paddingRight: 24 }}
      >
        <option value="__all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
