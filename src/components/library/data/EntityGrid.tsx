"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../chrome/Icon";
import { Button } from "../controls/Button";
import { DataTable, type Column } from "./DataTable";
import { SearchInput } from "./SearchInput";
import { FilterChip, type FilterOption } from "./FilterChip";
import { Toolbar } from "./Toolbar";
import { Pagination } from "./Pagination";

/**
 * Schema-driven server-paginated grid.
 *
 * Composes the library's grid atoms — Toolbar / SearchInput / FilterChip /
 * DataTable / Pagination — into the canonical CRUD-grid shape used by the
 * admin pages: search input, optional filter chips, page-size selector,
 * optional "Add new" action, sorted/paginated rows, per-row action menu,
 * paginator footer.
 *
 * Server contract: the grid POSTs no body. It builds a GET URL by appending
 * `q`, every filter value, `page`, and `limit` as query parameters to
 * `endpoint`. The response is expected to be JSON in the shape
 *
 *   { rows: T[]; total: number; page: number; pageSize: number }
 *
 * Override `rowsKey` / `totalKey` if the endpoint uses different field
 * names. The fetch is `cache: "no-store"` so the grid always reflects
 * the latest server state after a mutation.
 *
 * This component replaces the hand-rolled state machinery in
 * `admin/AdminGrid.tsx` and `admin/RefTableGrid.tsx`. Migrate those files
 * to consume `<EntityGrid>` in Phase 4.
 */

export type EntityRow = { id: string };

export type EntityColumn<Row> = Column<Row>;

export type EntityFilter = {
  key: string;
  label: ReactNode;
  options: FilterOption[];
  /** Default "All". */
  allLabel?: ReactNode;
};

export type EntityRowAction<Row> = {
  id: string;
  label: ReactNode;
  icon?: IconName;
  /** When true, the action is rendered in red. */
  destructive?: boolean;
  onSelect: (row: Row) => void | Promise<void>;
  /** When true, the action is shown but greyed out. */
  disabled?: (row: Row) => boolean;
  /** When false, the action is hidden for this row. */
  visible?: (row: Row) => boolean;
};

export type EntityAddAction = {
  label?: ReactNode;
  /** Either onClick (opens a modal in the caller) or href (navigates). */
  onClick?: () => void;
  href?: string;
};

export type EntityGridProps<Row extends EntityRow> = {
  /** API endpoint for server-paginated mode. The grid appends
   *  `?q=…&page=…&limit=…&<filter>=…`. Mutually exclusive with `rows`. */
  endpoint?: string;
  /** Pre-fetched rows for client-paginated mode. When supplied, the grid
   *  skips the fetch effect and filters / paginates entirely in-browser.
   *  Use for small datasets already scoped server-side (e.g. a provider's
   *  own resources). Mutually exclusive with `endpoint`. */
  rows?: Row[];
  /** Client-mode only: which Row fields the free-text search matches against. */
  searchableKeys?: (keyof Row & string)[];
  columns: EntityColumn<Row>[];
  filters?: EntityFilter[];
  rowActions?: EntityRowAction<Row>[];
  /** Render an "Add new" button on the right of the toolbar. */
  addAction?: EntityAddAction;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  /** Path into the response where the rows live. Default "rows". */
  rowsKey?: string;
  /** Path into the response for the total count. Default "total". */
  totalKey?: string;
  /** URL param name for the free-text search. Default "q". */
  searchParam?: string;
  /** URL param name for the 1-indexed page number. Default "page". */
  pageParam?: string;
  /** URL param name for the per-page count. Default "limit". */
  pageSizeParam?: string;
  /** Extra fixed URL params merged into every fetch (e.g. `{ sort: "name" }`). */
  extraParams?: Record<string, string>;
  /** Empty-state copy when the grid has zero rows. */
  emptyState?: string;
  /** Re-fetch token: bump this from the parent after a mutation to reload. */
  reloadKey?: number;
  /** Custom renderer for the row-actions column. When set, the inline
   *  icon-button row from `rowActions` is replaced by this callback's
   *  return value. Used by `AdminGrid` to keep its `<RowActionMenu>`
   *  dropdown integration. Has no effect if `rowActions` is also set;
   *  the renderer takes precedence. */
  renderRowActions?: (row: Row) => ReactNode;
};

type FetchState<Row> = {
  rows: Row[];
  total: number;
  loading: boolean;
  error: string | null;
};

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

export function EntityGrid<Row extends EntityRow>({
  endpoint,
  rows: clientRows,
  searchableKeys,
  columns,
  filters = [],
  rowActions,
  addAction,
  searchPlaceholder = "Search…",
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 25,
  rowsKey = "rows",
  totalKey = "total",
  searchParam = "q",
  pageParam = "page",
  pageSizeParam = "limit",
  extraParams,
  emptyState = "Nothing matches the current filters.",
  reloadKey = 0,
  renderRowActions
}: EntityGridProps<Row>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [state, setState] = useState<FetchState<Row>>({
    rows: [],
    total: 0,
    loading: true,
    error: null
  });
  const abortRef = useRef<AbortController | null>(null);

  // Build URL. Memoised so the effect depends on a stable value.
  const url = useMemo(() => {
    const sp = new URLSearchParams();
    if (search.trim() !== "") sp.set(searchParam, search.trim());
    for (const [key, value] of Object.entries(filterValues)) {
      if (value !== undefined) sp.set(key, value);
    }
    sp.set(pageParam, String(page));
    sp.set(pageSizeParam, String(pageSize));
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        sp.set(key, value);
      }
    }
    const qs = sp.toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
  }, [endpoint, search, filterValues, page, pageSize, searchParam, pageParam, pageSizeParam, extraParams]);

  // Client mode short-circuit: when `rows` is supplied directly, skip the
  // fetch effect entirely. The derived state below handles client-side
  // filtering, search, and pagination.
  const isClientMode = clientRows !== undefined;

  useEffect(() => {
    if (isClientMode) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState((s) => ({ ...s, loading: true, error: null }));
    void (async () => {
      try {
        const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as Record<string, unknown>;
        const rows = (data[rowsKey] as Row[]) ?? [];
        const total = (data[totalKey] as number) ?? rows.length;
        setState({ rows, total, loading: false, error: null });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState({
          rows: [],
          total: 0,
          loading: false,
          error: e instanceof Error ? e.message : "Could not load."
        });
      }
    })();
    return () => ac.abort();
  }, [url, rowsKey, totalKey, reloadKey, isClientMode]);

  // Client mode: filter + paginate the supplied rows in-browser.
  const clientDerived = useMemo(() => {
    if (!isClientMode || !clientRows) {
      return null;
    }
    const q = search.trim().toLowerCase();
    let filtered = clientRows;
    // Apply filters (each filter is { key, options }, value is the selected option).
    for (const [key, value] of Object.entries(filterValues)) {
      if (value === undefined) continue;
      filtered = filtered.filter((row) => String((row as Record<string, unknown>)[key] ?? "") === value);
    }
    // Apply search.
    if (q && searchableKeys && searchableKeys.length > 0) {
      filtered = filtered.filter((row) =>
        searchableKeys.some((k) => {
          const v = (row as Record<string, unknown>)[k];
          return typeof v === "string" && v.toLowerCase().includes(q);
        })
      );
    }
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    return { rows: paginated, total };
  }, [isClientMode, clientRows, search, filterValues, page, pageSize, searchableKeys]);

  // Active state — client mode uses derived, server mode uses fetched state.
  const activeState: FetchState<Row> = isClientMode && clientDerived
    ? { rows: clientDerived.rows, total: clientDerived.total, loading: false, error: null }
    : state;

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      setFilterValues((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    []
  );

  const onSearchChange = useCallback((next: string) => {
    setSearch(next);
    setPage(1);
  }, []);

  const onPageSizeChange = useCallback((next: number) => {
    setPageSize(next);
    setPage(1);
  }, []);

  // Project rows through the optional row-actions column. The grid always
  // surfaces a final "Actions" column when `rowActions` or `renderRowActions`
  // is supplied. `renderRowActions` wins when both are set.
  const projectedColumns: Column<Row>[] = useMemo(() => {
    if (renderRowActions) {
      return [
        ...columns,
        {
          key: "__actions",
          label: "Actions",
          render: (row) => renderRowActions(row)
        }
      ];
    }
    if (!rowActions || rowActions.length === 0) return columns;
    return [
      ...columns,
      {
        key: "__actions",
        label: "Actions",
        render: (row) => (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            {rowActions
              .filter((a) => (a.visible ? a.visible(row) : true))
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="r-card-action-link"
                  style={{
                    color: a.destructive ? "#ef4444" : "var(--text-2)",
                    opacity: a.disabled?.(row) ? 0.4 : 1,
                    cursor: a.disabled?.(row) ? "not-allowed" : "pointer"
                  }}
                  disabled={a.disabled?.(row)}
                  onClick={() => void a.onSelect(row)}
                  title={typeof a.label === "string" ? a.label : undefined}
                >
                  {a.icon ? <Icon name={a.icon} size={12} /> : null}
                  {a.label}
                </button>
              ))}
          </span>
        )
      }
    ];
  }, [columns, rowActions, renderRowActions]);

  return (
    <div>
      <Toolbar
        left={
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        }
        filters={
          <>
            {filters.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                value={filterValues[f.key]}
                options={f.options}
                onChange={(v) => setFilter(f.key, v)}
                allLabel={f.allLabel}
              />
            ))}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
              <span>Page size</span>
              <select
                className="p-input p-select"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number.parseInt(e.target.value, 10))}
                style={{ height: 30, fontSize: 12, paddingRight: 24 }}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
        right={
          addAction ? (
            <Button
              intent="primary"
              leadingIcon="plus"
              onClick={addAction.onClick}
              href={addAction.href}
            >
              {addAction.label ?? "Add new"}
            </Button>
          ) : null
        }
      />

      {activeState.error ? (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid rgba(239, 68, 68, 0.3)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "#ef4444",
            fontSize: 13
          }}
        >
          {activeState.error}
        </div>
      ) : null}

      <div style={{ opacity: activeState.loading ? 0.5 : 1, transition: "opacity 160ms" }}>
        <DataTable
          rows={activeState.rows}
          columns={projectedColumns}
          emptyState={activeState.loading ? "Loading…" : emptyState}
          keyOf={(r) => r.id}
        />
      </div>

      {activeState.total > pageSize ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={activeState.total}
          onChange={setPage}
        />
      ) : null}
    </div>
  );
}
// safe
