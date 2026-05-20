"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

/**
 * Generic admin CRUD grid used by `/admin/users`, `/admin/providers`,
 * `/admin/resources`. Loads the configured list endpoint with `q` + filters
 * + page + pageSize, renders the columns the caller supplies, exposes per-row
 * action slots, and ships an "Add new" toolbar button that opens an entity-
 * specific modal supplied by the caller.
 *
 * Aligned with `ai-registry-specs/shared/admin-crud.md`.
 */

export type GridFilter = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  /** Default empty value for "no filter". */
  emptyLabel?: string;
};

export type GridColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  mono?: boolean;
};

export type ListResponse<Row> = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AdminGridProps<Row extends { id: string }> = {
  /** API base path, e.g. `/api/admin/users`. */
  endpoint: string;
  searchPlaceholder: string;
  filters?: GridFilter[];
  columns: GridColumn<Row>[];
  /**
   * Per-row trailing action slot (rendered after the row data). Receives the
   * row plus a reload callback the consumer should call after a successful
   * mutation (so the grid refreshes without a full page reload).
   */
  actions: (row: Row, reload: () => void) => ReactNode;
  /** "Add new" modal contents. Supplied as a render prop so the consumer can
   *  use any form layout. The grid handles the modal chrome (backdrop, close,
   *  title) and provides a `close()` callback that also reloads the grid. */
  addModal?: {
    title: string;
    render: (close: () => void) => ReactNode;
  };
  emptyState: string;
};

const PAGE_SIZES = [10, 20, 50, 100];

export function AdminGrid<Row extends { id: string }>(props: AdminGridProps<Row>) {
  // Seed q + filter values from the URL on first paint so a deep link
  // (e.g. /admin/users?q=alice@example.com) lands with the row already
  // pre-filtered. The header-search uses this exact pattern when it routes
  // a user-kind result into the admin CRUD area.
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialFilters: Record<string, string> = {};
  if (props.filters) {
    for (const f of props.filters) {
      const v = searchParams.get(f.id);
      if (v) initialFilters[f.id] = v;
    }
  }

  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [filterValues, setFilterValues] =
    useState<Record<string, string>>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<ListResponse<Row> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, filterValues, pageSize]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      for (const [k, v] of Object.entries(filterValues)) if (v) params.set(k, v);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      try {
        const res = await registryFetch(withBase(`${props.endpoint}?${params.toString()}`));
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            detail?: string;
          };
          throw new Error(body.error ?? body.detail ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ListResponse<Row>;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.endpoint, debouncedQ, filterValues, page, pageSize, version]);

  const reload = () => setVersion((v) => v + 1);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16
        }}
      >
        <div className="search-input" style={{ minWidth: 280, flex: 1, maxWidth: 480 }}>
          <Icon name="search" size={15} />
          <input
            placeholder={props.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {props.filters?.map((f) => (
          <select
            key={f.id}
            className="auth-input"
            style={{ width: 160 }}
            value={filterValues[f.id] ?? ""}
            onChange={(e) =>
              setFilterValues((prev) => ({ ...prev, [f.id]: e.target.value }))
            }
            aria-label={f.label}
          >
            <option value="">{f.emptyLabel ?? `All ${f.label.toLowerCase()}`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number.parseInt(e.target.value, 10))}
          className="auth-input"
          style={{ width: 110 }}
          aria-label="Page size"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>

        {props.addModal ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddOpen(true)}
            style={{ marginLeft: "auto" }}
          >
            <Icon name="plus" size={12} /> Add new
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="field-error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              {props.columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!data && busy ? (
              <tr>
                <td
                  colSpan={props.columns.length + 1}
                  className="mono"
                  style={{ textAlign: "center", color: "var(--text-3)" }}
                >
                  Loading…
                </td>
              </tr>
            ) : null}
            {data && data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={props.columns.length + 1}
                  className="mono"
                  style={{ textAlign: "center", color: "var(--text-3)" }}
                >
                  {props.emptyState}
                </td>
              </tr>
            ) : null}
            {data?.rows.map((row) => (
              <tr key={row.id}>
                {props.columns.map((c) => (
                  <td key={c.key} className={c.mono ? "mono" : undefined}>
                    {c.render(row)}
                  </td>
                ))}
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {props.actions(row, reload)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 12,
            color: "var(--text-3)"
          }}
        >
          <span>
            Page {data.page} of {totalPages} · {data.total} total
            {busy ? " · loading…" : ""}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="r-card-action-link"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="r-card-action-link"
              disabled={!data.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {addOpen && props.addModal ? (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div
            className="glass"
            style={{ maxWidth: 560, padding: 24, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16
              }}
            >
              <h3 style={{ margin: 0 }}>{props.addModal.title}</h3>
              <button
                type="button"
                className="r-card-action-link"
                onClick={() => setAddOpen(false)}
                aria-label="Close"
                style={{ color: "var(--text)" }}
              >
                <Icon name="x" size={12} /> Close
              </button>
            </header>
            {props.addModal.render(() => {
              setAddOpen(false);
              reload();
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
