"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/public/Icon";
import type { RefTableConfig } from "@/lib/admin/reference-tables";
import { withBase } from "@/lib/with-base";

/**
 * Server-side-paginated CRUD grid driven by a `RefTableConfig`. Renders the
 * search input, the active-filter dropdown (when applicable), the data
 * grid, the per-row action icons (view / edit / delete), and the paginator.
 *
 * Loads `/api/admin/ref/[table]` on mount and on every filter / page change.
 */

type Row = Record<string, unknown> & { id: string };

type ListResponse = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

const PAGE_SIZES = [10, 20, 50, 100];

export function RefTableGrid({ config }: { config: RefTableConfig }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<ListResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [version, setVersion] = useState(0); // forces refetch after delete

  // Debounced search.
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, active, pageSize]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQ.trim() !== "") params.set("q", debouncedQ.trim());
      if (config.hasActive && active !== "all") params.set("active", active);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      try {
        const res = await fetch(withBase(`/api/admin/ref/${config.id}?${params.toString()}`));
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
          throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ListResponse;
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
  }, [config.id, config.hasActive, debouncedQ, active, page, pageSize, version]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(withBase(`/api/admin/ref/${config.id}/${deleting.id}`), {
        method: "DELETE"
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; title?: string };
        throw new Error(body.detail ?? body.title ?? `HTTP ${res.status}`);
      }
      setDeleting(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

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
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {config.hasActive ? (
          <select
            value={active}
            onChange={(e) => setActive(e.target.value as typeof active)}
            className="auth-input"
            style={{ width: 140 }}
            aria-label="Active filter"
          >
            <option value="all">All</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        ) : null}

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

        <Link
          href={`/admin/ref/${config.id}/new`}
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
        >
          <Icon name="plus" size={12} /> Add new
        </Link>
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
              {config.gridColumns.map((col) => (
                <th key={col}>{labelFor(config, col)}</th>
              ))}
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!data && busy ? (
              <tr>
                <td colSpan={config.gridColumns.length + 1} className="mono" style={{ textAlign: "center", color: "var(--text-3)" }}>
                  Loading…
                </td>
              </tr>
            ) : null}
            {data && data.rows.length === 0 ? (
              <tr>
                <td colSpan={config.gridColumns.length + 1} className="mono" style={{ textAlign: "center", color: "var(--text-3)" }}>
                  No rows match the current filter.
                </td>
              </tr>
            ) : null}
            {data?.rows.map((row) => (
              <tr key={row.id}>
                {config.gridColumns.map((col) => (
                  <td key={col} className={col === "code" ? "mono" : undefined}>
                    {renderCell(row[col])}
                  </td>
                ))}
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/admin/ref/${config.id}/${row.id}`}
                      className="r-card-action-link"
                      title="View"
                      aria-label="View"
                    >
                      <Icon name="eye" size={12} />
                    </Link>
                    <Link
                      href={`/admin/ref/${config.id}/${row.id}/edit`}
                      className="r-card-action-link"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={12} />
                    </Link>
                    <button
                      type="button"
                      className="r-card-action-link"
                      onClick={() => setDeleting(row)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Icon name="trash" size={12} />
                    </button>
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

      {deleting ? (
        <div className="modal-backdrop" onClick={() => setDeleting(null)}>
          <div
            className="glass"
            style={{ maxWidth: 460, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 style={{ margin: 0, marginBottom: 8 }}>Delete row?</h3>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 18 }}>
              This permanently removes the entry from <code>{config.label}</code>. If
              other rows reference it, deletion is blocked — toggle <code>active</code>
              to false instead.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmDelete}
                disabled={busy}
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function renderCell(value: unknown) {
  if (value === null || value === undefined || value === "") return <span style={{ color: "var(--text-3)" }}>—</span>;
  if (typeof value === "boolean")
    return value ? (
      <span className="tag" style={{ color: "#10b981" }}>active</span>
    ) : (
      <span className="tag">inactive</span>
    );
  if (typeof value === "string" && value.length > 80) return value.slice(0, 77) + "…";
  return String(value);
}

function labelFor(config: RefTableConfig, key: string): string {
  const f = config.fields.find((x) => x.key === key);
  return f?.label ?? key;
}
