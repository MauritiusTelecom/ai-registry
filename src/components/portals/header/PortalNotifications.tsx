"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/public/Icon";

/**
 * Notifications dropdown. Phase 4 will wire to a real stream (review queue,
 * verification expiries, audit signing); for now we mock four entries that
 * mirror the prototype so the visual contract is locked.
 */

type Notification = {
  id: number;
  kind: "review" | "alert" | "audit" | "system";
  title: string;
  body: string;
  ts: string;
  unread: boolean;
};

const SEED: Notification[] = [
  {
    id: 1,
    kind: "review",
    title: "New submission queued",
    body: "“mcp/edu-curriculum” awaits sovereignty review",
    ts: "2m ago",
    unread: true
  },
  {
    id: 2,
    kind: "alert",
    title: "Provider verification expiring",
    body: "Renew DNS-TXT proof in 7 days",
    ts: "1h ago",
    unread: true
  },
  {
    id: 3,
    kind: "audit",
    title: "Audit log signed",
    body: "47 status changes notarised",
    ts: "3h ago",
    unread: true
  },
  {
    id: 4,
    kind: "system",
    title: "Scheduled maintenance",
    body: "Sun 03:00 GMT · 12 minutes",
    ts: "Yesterday",
    unread: false
  }
];

export function PortalNotifications() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(SEED);
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
  function markRead(id: number) {
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
            {notifs.map((n) => (
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
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
