"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/public/Icon";

/**
 * User dropdown — avatar + name + role badge that reveals a panel with:
 *
 *   - Identity (name + email)
 *   - Switch role (only the portals the user can actually reach are listed)
 *   - Account links (public site, settings, log out)
 *
 * Receives the user envelope as a prop from the server-side chrome so this
 * component never has to fetch /api/auth/me itself.
 */

export type PortalUser = {
  name: string;
  email: string;
  roles: string[];
  providerName: string | null;
};

const ROLE_PORTALS: { id: string; label: string; href: string; icon: "shield" | "layers" | "check" | "flag" }[] = [
  { id: "admin", label: "Admin Portal", href: "/admin", icon: "shield" },
  { id: "provider", label: "Provider Portal", href: "/provider", icon: "layers" },
  { id: "verifier", label: "Verifier Portal", href: "/verifier", icon: "check" },
  { id: "sovereign", label: "Sovereign Ops", href: "/sovereign", icon: "flag" }
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase().slice(0, 2) || "··";
}

export function PortalUserDropdown({ user, currentRole }: { user: PortalUser; currentRole: string }) {
  const [open, setOpen] = useState(false);
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

  // Admin can also reach every other portal (per ROLE_ALIASES in auth-gate).
  const isAdmin = user.roles.includes("admin");
  const accessible = ROLE_PORTALS.filter((p) => isAdmin || user.roles.includes(p.id));

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <div ref={ref} className="p-icon-btn-wrap">
      <button type="button" className="p-user" onClick={() => setOpen((v) => !v)}>
        <span className="p-avatar">{initialsOf(user.name)}</span>
        <span className="p-user-text">
          <span className="p-user-name">{user.name}</span>
          <span className="p-user-role">
            {currentRole}
            {user.providerName ? ` · ${user.providerName}` : ""}
          </span>
        </span>
        <Icon name="chevron-down" size={12} />
      </button>
      {open ? (
        <div className="p-dropdown" style={{ width: 280 }}>
          <div
            className="p-dropdown-head"
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}
          >
            <div className="p-dropdown-title">{user.name}</div>
            <div className="p-dropdown-sub mono">{user.email}</div>
          </div>

          {accessible.length > 0 ? (
            <>
              <div className="p-dropdown-section">Switch role</div>
              {accessible.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className={`p-dropdown-item ${p.id === currentRole ? "active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={p.icon} size={14} />
                  <span>{p.label}</span>
                  {p.id === currentRole ? <span className="p-dropdown-tag">current</span> : null}
                </Link>
              ))}
            </>
          ) : null}

          <div className="p-dropdown-section">Account</div>
          <Link href="/" className="p-dropdown-item" onClick={() => setOpen(false)}>
            <Icon name="globe" size={14} />
            <span>Public site</span>
          </Link>
          <Link href="/provider/settings" className="p-dropdown-item" onClick={() => setOpen(false)}>
            <Icon name="user" size={14} />
            <span>Settings</span>
          </Link>
          <button type="button" className="p-dropdown-item" onClick={handleLogout}>
            <Icon name="log-out" size={14} />
            <span>Log out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
