"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";

// Top-nav links. Ecosystem / Governance / Documentation moved out of the
// top nav — they remain reachable from the footer columns (see Footer in
// components/public/Footer.tsx) so this primary navigation stays focused on
// the four core surfaces: Home, Registry, Providers, Contact.
const NAV_ITEMS = [
  { href: "/", label: "Home", id: "home" },
  { href: "/registry", label: "Registry", id: "registry" },
  { href: "/providers", label: "Providers", id: "providers" },
  { href: "/contact", label: "Contact", id: "contact" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
    </button>
  );
}

function UserMenu() {
  const { user, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!user) {
    return (
      <button type="button" className="nav-cta" onClick={() => login("admin")}>
        Log In
        <Icon name="arrow-up-right" size={12} />
      </button>
    );
  }

  const initials = user.firstName.slice(0, 1).toUpperCase();
  const isAdmin = user.roles.includes("admin");
  const isProvider = user.roles.includes("provider");
  const isVerifier = user.roles.includes("verifier") || isAdmin;
  const isSovereign = user.roles.includes("sovereign") || isAdmin;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="nav-user" onClick={() => setOpen((v) => !v)}>
        <span className="nav-avatar">{initials}</span>
        <span className="nav-user-text">
          <span className="nav-user-name">{user.firstName}</span>
          <span className="nav-user-email">{user.email}</span>
        </span>
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <div className="dropdown-head">
            <span className="nav-avatar">{initials}</span>
            <div className="dropdown-head-text">
              <div className="dropdown-head-name">{user.firstName}</div>
              <div className="dropdown-head-email">{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 6 }}>
            {isAdmin && (
              <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="shield" size={14} /> Admin Portal
                <span className="role-badge">admin</span>
              </button>
            )}
            {isProvider && (
              <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="layers" size={14} /> Provider Portal
                <span className="role-badge">provider</span>
              </button>
            )}
            {isVerifier && (
              <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="check" size={14} /> Verifier Portal
                <span className="role-badge">verifier</span>
              </button>
            )}
            {isSovereign && (
              <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="flag" size={14} /> Sovereign Portal
                <span className="role-badge">sovereign</span>
              </button>
            )}
            <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
              <Icon name="user" size={14} /> Account settings
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            >
              <Icon name="log-out" size={14} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <span className="nav-logo-mark" />
          <span>Mauritius AI Registry</span>
        </Link>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
