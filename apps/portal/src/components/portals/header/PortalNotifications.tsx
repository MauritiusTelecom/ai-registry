"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/public/Icon";
import { withBase } from "@airegistry/sdk";

type PortalRoleProp = "admin" | "provider" | "verifier" | "sovereign";

/**
 * Notifications dropdown. The entries are loaded server-side, scoped to the
 * currently-signed-in user's role and (for providers) their provider
 * linkage — see `loadPortalNotifications` in `src/lib/portals/notifications.ts`.
 * That keeps a provider from ever seeing admin-flavoured items like
 * "Audit log signed" in their bell.
 *
 * Read state is PERSISTED server-side via NotificationRead — see the API
 * routes under /api/portal/notifications/{read,read-all}. The optimistic
 * UI update fires immediately so the badge feels instant; the POST is
 * fire-and-forget and rolls back the local state only on a failed
 * response.
 */

type Notification = {
  id: string;
  kind: "review" | "alert" | "audit" | "system";
  title: string;
  body: string;
  ts: string;
  unread: boolean;
};

export function PortalNotifications({
  initial = [],
  currentRole
}: {
  initial?: Notification[];
  /** Drives the destination of the dropdown's "View all" link. */
  currentRole: PortalRoleProp;
}) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(initial);
  const ref = useRef<HTMLDivElement | null>(null);
  const viewAllHref = `/${currentRole}/notifications`;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const unread = notifs.filter((n) => n.unread).length;

  /**
   * Optimistically flip `unread = false` for the given ids, then persist
   * via POST /api/portal/notifications/read. On a failed POST we roll the
   * affected entries back so the badge eventually reflects truth.
   */
  async function persistRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const previousUnread = new Set(
      notifs.filter((n) => n.unread && ids.includes(n.id)).map((n) => n.id)
    );
    // Optimistic update.
    setNotifs((ns) =>
      ns.map((n) => (ids.includes(n.id) ? { ...n, unread: false } : n))
    );
    try {
      const res = await fetch(withBase("/api/portal/notifications/read"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
    } catch (error) {
      console.warn("notifications.persist_read_failed", error);
      // Roll back only the entries we previously had as unread.
      setNotifs((ns) =>
        ns.map((n) => (previousUnread.has(n.id) ? { ...n, unread: true } : n))
      );
    }
  }

  async function markAllRead() {
    const allIds = notifs.filter((n) => n.unread).map((n) => n.id);
    if (allIds.length === 0) return;
    const previousUnread = new Set(allIds);
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
    try {
      const res = await fetch(withBase("/api/portal/notifications/read-all"), {
        method: "POST",
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
    } catch (error) {
      console.warn("notifications.persist_read_all_failed", error);
      setNotifs((ns) =>
        ns.map((n) => (previousUnread.has(n.id) ? { ...n, unread: true } : n))
      );
    }
  }

  function markRead(id: string) {
    // Fire-and-forget — `persistRead` handles its own state updates.
    void persistRead([id]);
  }

  return (
    <div ref={ref} className="p-icon-btn-wrap">
      <button
        type="button"
        className="p-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Icon name="bell" size={15} />
        {unread > 0 ? <span className="p-icon-badge">{unread}</span> : null}
      </button>
      {open ? (
        <div className="p-dropdown p-notif-drop">
          <div className="p-dropdown-head">
            <div className="p-dropdown-title">Notifications</div>
            <button type="button" className="p-link" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          </div>
          <div className="p-notif-list">
            {notifs.length === 0 ? (
              <div
                style={{
                  padding: "18px 16px",
                  fontSize: 13,
                  color: "var(--text-3)",
                  textAlign: "center"
                }}
              >
                Nothing new for you right now.
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`p-notif-item ${n.unread ? "unread" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className={`p-notif-dot kind-${n.kind}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="p-notif-title">{n.title}</div>
                    <div className="p-notif-body">{n.body}</div>
                    <div className="p-notif-ts mono">{n.ts}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          {/*
            Footer link to the full notifications page. Always rendered
            even when the dropdown is empty so the user has a clear way
            to discover the wider archive.
          */}
          <div className="p-notif-foot">
            <Link
              href={viewAllHref}
              className="p-link"
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
