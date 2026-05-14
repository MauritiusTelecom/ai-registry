"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/public/Icon";

/**
 * Notifications dropdown. The entries are loaded server-side, scoped to the
 * currently-signed-in user's role and (for providers) their provider
 * linkage — see `loadPortalNotifications` in `src/lib/portals/notifications.ts`.
 * That keeps a provider from ever seeing admin-flavoured items like
 * "Audit log signed" in their bell.
 */

type Notification = {
  id: string;
  kind: "review" | "alert" | "audit" | "system";
  title: string;
  body: string;
  ts: string;
  unread: boolean;
};

export function PortalNotifications({ initial = [] }: { initial?: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(initial);
  const ref = useRef<HTMLDivElement | null>(null);

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

  function markAllRead() {
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
  }
  function markRead(id: string) {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
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
            <button type="button" className="p-link" onClick={markAllRead}>
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
        </div>
      ) : null}
    </div>
  );
}
