"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

/**
 * Command-palette search.
 *
 *   - ⌘K / Ctrl-K anywhere opens (or closes) the modal.
 *   - On open the modal shows a Pages quick-nav so you can jump to a
 *     section without typing anything.
 *   - Type to search across resources, providers, complaints, reviews,
 *     users (admin only), and the page list — scoped to the current
 *     user's role on the server (`/api/portal/search`).
 *   - ↑ / ↓ moves selection, Enter opens the highlighted result.
 *   - Esc or click-outside dismisses.
 */

type SearchKind =
  | "resource"
  | "provider"
  | "user"
  | "complaint"
  | "review"
  | "incident"
  | "page";

type SearchResult = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string | null;
  href: string;
  icon: string;
};

type SearchResponse = { results?: SearchResult[]; error?: string };

const DEBOUNCE_MS = 180;
const MIN_QUERY_FOR_DB = 2;

const GROUP_ORDER: SearchKind[] = [
  "page",
  "resource",
  "complaint",
  "review",
  "incident",
  "provider",
  "user"
];
const GROUP_LABEL_KEYS: Record<SearchKind, string> = {
  page: "groupPages",
  resource: "groupResources",
  complaint: "groupComplaints",
  review: "groupReviews",
  incident: "groupIncidents",
  provider: "groupProviders",
  user: "groupUsers"
};

export function PortalSearch({
  placeholder
}: {
  placeholder?: string;
}) {
  const t = useTranslations("portalSearch");
  const effectivePlaceholder = placeholder ?? t("defaultPlaceholder");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // `mounted` gates the portal target so the first server-render doesn't
  // try to read `document.body` (which doesn't exist on the server). Once
  // the component hydrates on the client we set it true and the portal
  // attaches to <body> on subsequent renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Open / close keyboard shortcut ──────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset state every time the modal opens. The follow-up effect that
  // fetches results on debouncedQuery change will then immediately fire
  // a `?q=` request which the server short-circuits to the page list.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setError(null);
    setSelected(0);
  }, [open]);

  // ─── Debounce the query ──────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // ─── Fetch results whenever the debounced query settles ──────────
  // Empty query is allowed — the server returns the static Pages list
  // so the modal opens already populated.
  useEffect(() => {
    if (!open) return;
    const q = debouncedQuery.trim();
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    registryFetch(withBase(`/api/portal/search?q=${encodeURIComponent(q)}`), {
      credentials: "same-origin",
      signal: controller.signal
    })
      .then(async (res) => {
        const data = (await res.json()) as SearchResponse;
        if (!res.ok) {
          throw new Error(data.error ?? `status=${res.status}`);
        }
        setResults(data.results ?? []);
        setSelected(0);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setResults([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, open]);

  // ─── Keyboard navigation inside the modal ────────────────────────
  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[selected];
      if (target) goTo(target.href);
    }
  }

  function goTo(href: string): void {
    setOpen(false);
    router.push(href);
  }

  // Scroll the selected row into view as the user arrows down past the fold.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selected}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Group results in fixed order so the visual stays stable across keystrokes.
  const grouped: Array<{ kind: SearchKind; items: SearchResult[] }> = [];
  for (const kind of GROUP_ORDER) {
    const items = results.filter((r) => r.kind === kind);
    if (items.length > 0) grouped.push({ kind, items });
  }

  const trimmedQ = query.trim();
  const hasQuery = trimmedQ.length > 0;
  const tooShort = hasQuery && trimmedQ.length < MIN_QUERY_FOR_DB;

  return (
    <>
      <button
        type="button"
        className="p-search"
        onClick={() => setOpen(true)}
        aria-label={t("openPalette")}
      >
        <Icon name="search" size={14} />
        <span>{effectivePlaceholder}</span>
        <kbd>⌘K</kbd>
      </button>

      {open && mounted
        ? createPortal(
        <div
          className="p-cmd-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div className="p-cmd" onClick={(e) => e.stopPropagation()}>
            <div className="p-cmd-input-wrap">
              <Icon name="search" size={16} />
              <input
                autoFocus
                placeholder={effectivePlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <kbd>esc</kbd>
            </div>

            <div className="p-cmd-body" ref={listRef}>
              {loading && results.length === 0 ? (
                <div className="p-cmd-hint">{t("searching")}</div>
              ) : error ? (
                <div className="p-cmd-hint p-cmd-hint-error">
                  {t("searchFailed", { error })}
                </div>
              ) : results.length === 0 ? (
                <div className="p-cmd-hint">
                  {tooShort
                    ? t("keepTyping")
                    : t("noMatches", { query: trimmedQ })}
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.kind} className="p-cmd-group">
                    <div className="p-cmd-group-label">
                      {t(GROUP_LABEL_KEYS[group.kind])}
                    </div>
                    {group.items.map((r) => {
                      const idx = results.indexOf(r);
                      const isSelected = idx === selected;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          data-idx={idx}
                          className={`p-cmd-row${isSelected ? " selected" : ""}`}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => goTo(r.href)}
                        >
                          <span className="p-cmd-icon" aria-hidden="true">
                            <Icon name={r.icon as IconName} size={15} />
                          </span>
                          <span className="p-cmd-title">{r.title}</span>
                          {r.subtitle && r.kind !== "page" ? (
                            <span className="p-cmd-subtitle">{r.subtitle}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="p-cmd-foot" aria-hidden="true">
              <span className="p-cmd-foot-chip">
                <kbd>↑↓</kbd> {t("navigate")}
              </span>
              <span className="p-cmd-foot-chip">
                <kbd>↵</kbd> {t("open")}
              </span>
              <span className="p-cmd-foot-chip">
                <kbd>esc</kbd> {t("close")}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )
        : null}
    </>
  );
}
