"use client";

import { Icon } from "../chrome/Icon";

/**
 * Mono-spaced grid pagination footer. Matches the prototype contract:
 * `Page X of Y · Z total` plus ← Prev / Next →.
 *
 *   <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
 */
export function Pagination({
  page,
  pageSize,
  total,
  onChange
}: {
  /** 1-indexed. */
  page: number;
  pageSize: number;
  total: number;
  onChange: (next: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const canPrev = safePage > 1;
  const canNext = safePage < pages;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        padding: "8px 4px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        color: "var(--text-2)"
      }}
    >
      <span>
        Page {safePage} of {pages} · {total} total
      </span>
      <span style={{ display: "inline-flex", gap: 6 }}>
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onChange(safePage - 1)}
          className="btn btn-ghost"
          style={{
            opacity: canPrev ? 1 : 0.5,
            cursor: canPrev ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontFamily: "inherit",
            fontSize: 12
          }}
        >
          <span style={{ transform: "rotate(180deg)", display: "inline-grid" }}>
            <Icon name="arrow-right" size={12} />
          </span>
          Prev
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onChange(safePage + 1)}
          className="btn btn-ghost"
          style={{
            opacity: canNext ? 1 : 0.5,
            cursor: canNext ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontFamily: "inherit",
            fontSize: 12
          }}
        >
          Next
          <Icon name="arrow-right" size={12} />
        </button>
      </span>
    </div>
  );
}
