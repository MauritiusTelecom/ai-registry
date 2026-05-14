"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Client-side filterable / searchable wrapper around DataTable's layout.
 *
 * Designed for the provider portal grid pages where the dataset is already
 * scoped to a single provider (small N) so we can filter / search entirely
 * in the browser — no extra network round-trip, no server-pagination
 * complexity. For larger admin grids (cross-provider, paginated) keep using
 * `AdminGrid` which fetches per query.
 *
 * Usage:
 *
 *   <FilteredDataTable
 *     rows={projectedRows}
 *     keyOf={(r) => r.id}
 *     emptyState="You haven't published any resources yet."
 *     searchPlaceholder="Search by title or AIR-ID…"
 *     searchableKeys={["title", "airId", "slug"]}
 *     filters={[
 *       { key: "kind",        label: "Kind",      options: [{ value: "model", label: "Model" }, …] },
 *       { key: "lifecycle",   label: "Lifecycle", options: […] }
 *     ]}
 *     columns={[
 *       { key: "title", label: "Title", render: (r) => <Link href={…}>{r.title}</Link> },
 *       …
 *     ]}
 *   />
 *
 * The component lives in a "use client" file because the column `render`
 * functions are closures that need to execute in the same module that
 * owns them — server-rendered closures can't be passed to a client
 * component as props.
 */

export type FilteredColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  mono?: boolean;
  width?: string;
};

export type FilterDef<Row> = {
  /** Field on Row to compare against the selected option value. */
  key: keyof Row & string;
  /** Visible label for the filter chip / select. */
  label: string;
  /** Available options. An "All" option is added automatically. */
  options: { value: string; label: string }[];
};

export type FilteredDataTableProps<Row extends Record<string, unknown>> = {
  rows: Row[];
  columns: FilteredColumn<Row>[];
  keyOf: (row: Row) => string;
  emptyState: string;
  /** Placeholder for the search box. */
  searchPlaceholder?: string;
  /** Field names whose string values are matched against the search query. */
  searchableKeys?: (keyof Row & string)[];
  /** Per-field filter definitions. Each renders as a select. */
  filters?: FilterDef<Row>[];
};

export function FilteredDataTable<Row extends Record<string, unknown>>({
  rows,
  columns,
  keyOf,
  emptyState,
  searchPlaceholder = "Search…",
  searchableKeys = [],
  filters = []
}: FilteredDataTableProps<Row>) {
  // Seed q + filter values from the URL on first paint so a deep link
  // (e.g. /provider/complaints?q=alice) lands pre-filtered. The header
  // search uses this pattern when it routes a complaint/review/incident
  // hit into the provider CRUD list pages.
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialFilters: Record<string, string> = {};
  for (const f of filters) {
    const v = searchParams.get(f.key);
    if (v) initialFilters[f.key] = v;
  }

  const [q, setQ] = useState(initialQ);
  const [filterValues, setFilterValues] =
    useState<Record<string, string>>(initialFilters);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      // Each active filter must match exactly.
      for (const [key, value] of Object.entries(filterValues)) {
        if (!value) continue;
        const cell = row[key as keyof Row];
        const stringified =
          cell === null || cell === undefined ? "" : String(cell);
        if (stringified !== value) return false;
      }
      // Search across all searchableKeys.
      if (needle === "") return true;
      for (const key of searchableKeys) {
        const cell = row[key];
        if (cell === null || cell === undefined) continue;
        if (String(cell).toLowerCase().includes(needle)) return true;
      }
      return false;
    });
  }, [rows, q, filterValues, searchableKeys]);

  const anyFilterActive =
    q.trim() !== "" || Object.values(filterValues).some((v) => v !== "");

  function resetAll(): void {
    setQ("");
    setFilterValues({});
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="p-grid-toolbar">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="p-grid-search"
        />
        {filters.map((f) => (
          <label key={f.key} className="p-grid-filter">
            <span className="p-grid-filter-label">{f.label}</span>
            <select
              value={filterValues[f.key] ?? ""}
              onChange={(e) =>
                setFilterValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
            >
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {anyFilterActive ? (
          <button
            type="button"
            className="p-grid-clear"
            onClick={resetAll}
            aria-label="Clear search and filters"
          >
            Clear
          </button>
        ) : null}
        <span className="p-grid-count" aria-live="polite">
          {filteredRows.length} of {rows.length}
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="p-empty">
          <div className="p-empty-text">
            {anyFilterActive
              ? "No rows match your search and filters."
              : emptyState}
          </div>
        </div>
      ) : (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={keyOf(row)}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.mono ? "mono" : undefined}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
