"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Icon } from "@airegistry/ui-kit";
import { useTheme } from "@airegistry/ui-kit";
import { useAuth } from "@airegistry/ui-kit";
import { withBase } from "@airegistry/sdk";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const NAV_ITEM_IDS = ["home", "registry", "providers", "contact"] as const;
const NAV_HREFS: Record<string, string> = {
  home: "/",
  registry: "/registry",
  providers: "/providers",
  contact: "/contact"
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LocaleSwitcherSlot() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  function switchTo(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  const otherLocale =
    (routing.locales as readonly string[]).find((l) => l !== locale) ??
    (locale === "fr" ? "en" : "fr");

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => switchTo(otherLocale)}
      aria-label={t("label")}
      title={t(otherLocale)}
      style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}
    >
      {otherLocale.toUpperCase()}
    </button>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("nav");
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={t("switchTheme", { theme: next })}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
    </button>
  );
}

function UserMenu() {
  const { user, logout, loading } = useAuth();
  const t = useTranslations("nav");
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

  if (loading || !user) {
    return (
      <Link href="/login" className="nav-cta hide-on-mobile">
        {t("logIn")}
        <Icon name="arrow-up-right" size={12} />
      </Link>
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
              <Link href="/admin" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="shield" size={14} /> {t("adminPortal")}
                <span className="role-badge">{t("roleAdmin")}</span>
              </Link>
            )}
            {isProvider && (
              <Link href="/provider" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="layers" size={14} /> {t("providerPortal")}
                <span className="role-badge">{t("roleProvider")}</span>
              </Link>
            )}
            {isVerifier && (
              <Link href="/verifier" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="check" size={14} /> {t("verifierPortal")}
                <span className="role-badge">{t("roleVerifier")}</span>
              </Link>
            )}
            {isSovereign && (
              <Link href="/sovereign" className="dropdown-item" onClick={() => setOpen(false)}>
                <Icon name="flag" size={14} /> {t("sovereignPortal")}
                <span className="role-badge">{t("roleSovereign")}</span>
              </Link>
            )}
            <button type="button" className="dropdown-item" onClick={() => setOpen(false)}>
              <Icon name="user" size={14} /> {t("accountSettings")}
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={async () => {
                await logout();
                setOpen(false);
                window.location.assign(withBase("/"));
              }}
            >
              <Icon name="log-out" size={14} /> {t("logOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const { user, loading } = useAuth();
  const t = useTranslations("nav");
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

  const showLogin = !loading && !user;

  return (
    <div ref={ref} className="nav-menu-mobile">
      <button
        type="button"
        className="theme-toggle"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "x" : "menu"} size={15} />
      </button>
      {open && (
        <div className="dropdown" role="menu" style={{ minWidth: 220 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEM_IDS.map((id) => (
              <Link
                key={id}
                href={NAV_HREFS[id]!}
                role="menuitem"
                className={`dropdown-item ${
                  isActive(pathname, NAV_HREFS[id]!) ? "active" : ""
                }`}
                onClick={() => setOpen(false)}
              >
                {t(id)}
              </Link>
            ))}
            {showLogin ? (
              <>
                <div
                  style={{
                    borderTop: "1px solid var(--hairline)",
                    margin: "6px 0"
                  }}
                />
                <Link
                  href="/login"
                  role="menuitem"
                  className="dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  <Icon name="arrow-up-right" size={14} /> {t("logIn")}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav({
  registryName,
  logoUrl
}: {
  registryName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname() ?? "/";
  const t = useTranslations("nav");
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo" aria-label={registryName}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBase(logoUrl)}
              alt=""
              className="nav-logo-mark"
              style={{ background: "transparent", boxShadow: "none", objectFit: "contain" }}
            />
          ) : (
            <span className="nav-logo-mark" />
          )}
          <span className="nav-logo-text">{registryName}</span>
        </Link>
        <div className="nav-links">
          {NAV_ITEM_IDS.map((id) => (
            <Link
              key={id}
              href={NAV_HREFS[id]!}
              className={`nav-link ${isActive(pathname, NAV_HREFS[id]!) ? "active" : ""}`}
            >
              {t(id)}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <LocaleSwitcherSlot />
          <ThemeToggle />
          <UserMenu />
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
