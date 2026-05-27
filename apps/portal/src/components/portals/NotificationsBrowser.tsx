"use client";


import { withBase } from "@airegistry/sdk";
import { registryFetch } from "@airegistry/ui-kit";

import { useMemo, useState } from "react";
import { Button } from "@/components/library";

/**
 * Full-page notifications surface.
 *
 * Receives the pre-derived role-scoped list from the server (see
 * `loadPortalNotifications({ unlimited: true })`) and wraps it with
 * search, kind filter, read/unread filter, pagination, per-row mark-read,
 * and a bulk "Mark all read" action that hits the same endpoints the bell
 * uses.
 *
 * Filtering and pagination are client-side because the dataset is bounded
 * (per-user, capped at 200 by the loader). Searching and mark-read both
 * stay synchronous — no extra fetches except the dismissal POSTs.
 */

type Notification = {
  id: string;
  kind: "review" | "alert" | "audit" | "system";
  title: string;
  body: string;
  ts: string;
  unread: boolean;
};

const KIND_LABEL_KEY: Record<Notification["kind"], string> = {
  review: "kindReview",
  alert: "kindAlert",
  audit: "kindAudit",
  system: "kindSystem"
};

const PAGE_SIZE = 20;

export function NotificationsBrowser({ initial }: { initial: Notification[] }) {
  const t = useTranslations("portalNotificationsBrowser");
  const [notifs, setNotifs] = useState<Notification[]>(initial);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"" | Notification["kind"]>("");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notifs.filter((n) => {
      if (kindFilter && n.kind !== kindFilter) return false;
      if (readFilter === "unread" && !n.unread) return false;
      if (readFilter === "read" && n.unread) return false;
      if (needle === "") return true;
      return (
        n.title.toLowerCase().includes(needle) ||
        n.body.toLowerCase().includes(needle)
      );
    });
  }, [notifs, q, kindFilter, readFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const unreadCount = notifs.filter((n) => n.unread).length;
  const anyFilterActive =
    q.trim() !== "" || kindFilter !== "" || readFilter !== "all";

  function resetFilters(): void {
    setQ("");
    setKindFilter("");
    setReadFilter("all");
    setPage(1);
  }

  async function persistRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const previousUnread = new Set(
      notifs.filter((n) => n.unread && ids.includes(n.id)).map((n) => n.id)
    );
    setNotifs((ns) =>
      ns.map((n) => (ids.includes(n.id) ? { ...n, unread: false } : n))
    );
    setBusy(true);
    try {
      const res = await registryFetch(withBase("/api/portal/notifications/read"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
    } catch (error) {
      console.warn("notifications.persist_read_failed", error);
      setNotifs((ns) =>
        ns.map((n) => (previousUnread.has(n.id) ? { ...n, unread: true } : n))
      );
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead(): Promise<void> {
    const allIds = notifs.filter((n) => n.unread).map((n) => n.id);
    if (allIds.length === 0) return;
    const previousUnread = new Set(allIds);
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
    setBusy(true);
    try {
      const res = await registryFetch(withBase("/api/portal/notifications/read-all"), {
        method: "POST",
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
    } catch (error) {
      console.warn("notifications.persist_read_all_failed", error);
      setNotifs((ns) =>
        ns.map((n) => (previousUnread.has(n.id) ? { ...n, unread: true } : n))
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="p-grid-toolbar">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="p-grid-search"
        />
        <label className="p-grid-filter">
          <span className="p-grid-filter-label">{t("kind")}</span>
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value as typeof kindFilter);
              setPage(1);
            }}
          >
            <option value="">{t("all")}</option>
            <option value="review">{t("kindReview")}</option>
            <option value="alert">{t("kindAlert")}</option>
            <option value="audit">{t("kindAudit")}</option>
            <option value="system">{t("kindSystem")}</option>
          </select>
        </label>
        <label className="p-grid-filter">
          <span className="p-grid-filter-label">{t("status")}</span>
          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value as typeof readFilter);
              setPage(1);
            }}
          >
            <option value="all">{t("all")}</option>
            <option value="unread">{t("unread")}</option>
            <option value="read">{t("read")}</option>
          </select>
        </label>
        {anyFilterActive ? (
          <button type="button" className="p-grid-clear" onClick={resetFilters}>
            {t("clear")}
          </button>
        ) : null}
        <span className="p-grid-count">
          {filtered.length} of {notifs.length}
        </span>
        <Button
          intent="secondary"
          size="sm"
          disabled={busy || unreadCount === 0}
          onClick={() => void markAllRead()}
        >
{busy ? "Saving…" : `Mark all read${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="p-empty">
          <div className="p-empty-text">
            {anyFilterActive
              ? t("noMatch")
              : t("nothingNew")}
          </div>
        </div>
      ) : (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th style={{ width: 110 }}>{t("kind")}</th>
                <th>{t("titleCol")}</th>
                <th>{t("detail")}</th>
                <th style={{ width: 110 }}>{t("when")}</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((n) => (
                <tr
                  key={n.id}
                  style={{
                    background: n.unread
                      ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                      : undefined
                  }}
                >
                  <td>
                    <span
                      aria-label={n.unread ? t("unread") : t("read")}
                      title={n.unread ? t("unread") : t("read")}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: n.unread
                          ? "var(--primary)"
                          : "var(--border-strong)"
                      }}
                    />
                  </td>
                  <td>
                    {/*
                      Plain uppercase label — the previous design used the
                      `p-notif-dot kind-<kind>` classes which paint a coloured
                      background (intended for the small circular dot in the
                      header dropdown). On a text label they rendered as
                      stretched ovals behind the text.
                    */}
                    <span
                      className={`p-notif-kind-label kind-${n.kind}`}
                      style={{
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: 10.5,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase"
                      }}
                    >
                      {t(KIND_LABEL_KEY[n.kind])}
                    </span>
                  </td>
                  <td style={{ fontWeight: n.unread ? 600 : 400 }}>{n.title}</td>
                  <td style={{ color: "var(--text-2)" }}>{n.body}</td>
                  <td className="mono" style={{ color: "var(--text-3)" }}>
                    {n.ts}
                  </td>
                  <td>
                    {n.unread ? (
                      <button
                        type="button"
                        className="p-link"
                        onClick={() => void persistRead([n.id])}
                        disabled={busy}
                        style={{ fontSize: 12 }}
                      >
                        {t("markRead")}
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            color: "var(--text-3)"
          }}
        >
          <span>
            {t("pagination", { page: safePage, totalPages, start: start + 1, end: Math.min(start + PAGE_SIZE, filtered.length), total: filtered.length })}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <Button
              intent="secondary"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
← Prev
            </Button>
            <Button
              intent="secondary"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}