"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@airegistry/ui-kit";
import type { PortalConfig } from "@/lib/portals/nav-config";
import { withBase } from "@airegistry/sdk";

const PORTAL_TITLE_KEYS: Record<string, string> = {
  admin: "admin.title",
  provider: "provider.title",
  verifier: "verifier.title",
  sovereign: "sovereign.title"
};

/**
 * Sidebar (client component for active-link highlighting).
 *
 * Nav labels are translation key identifiers stored in `<role>Nav` namespaces
 * (e.g. adminNav.dashboard). The sidebar resolves them at render time so the
 * nav-config.ts file stays a plain TypeScript config without hook calls.
 *
 * Group-level collapse: when a `NavGroup` carries `collapsible: true`, the
 * group header renders as a button with a chevron and persists the user's
 * open/closed choice in `localStorage` keyed by `nav.<role>.<groupId>`. The
 * group auto-expands whenever the active route is inside it, regardless of
 * the persisted choice (so the user can always see where they are).
 */
export function PortalSidebar({
  config,
  branding
}: {
  config: PortalConfig;
  branding?: { registryName: string; logoUrl: string | null };
}) {
  const tSidebar = useTranslations("portalSidebar");
  const tNav = useTranslations(`${config.role}Nav` as any);
  const tPortal = useTranslations();
  const pathname = usePathname() ?? "";
  const registryName = branding?.registryName ?? tSidebar("defaultRegistryName");
  const logoUrl = branding?.logoUrl ?? null;

  const portalLabel = PORTAL_TITLE_KEYS[config.role]
    ? tPortal(PORTAL_TITLE_KEYS[config.role] as any)
    : config.label;

  return (
    <aside className="p-sidebar">
      <div className="p-sidebar-head">
        <Link href="/" className="p-logo">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBase(logoUrl)}
              alt=""
              className="p-logo-mark"
              style={{ background: "transparent", boxShadow: "none", objectFit: "contain" }}
            />
          ) : (
            <span className="p-logo-mark" />
          )}
          <div className="p-logo-text">
            <span className="p-logo-name">{registryName}</span>
            <span className="p-logo-sub">{portalLabel}</span>
          </div>
        </Link>
      </div>

      <nav className="p-nav">
        {config.groups.map((group) => {
          const groupActive = group.items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== config.basePath &&
                pathname.startsWith(`${item.href}/`))
          );

          const resolvedGroupLabel = resolveNavLabel(tNav, group.label);

          if (group.collapsible) {
            return (
              <CollapsibleGroup
                key={group.id}
                role={config.role}
                groupId={group.id}
                label={resolvedGroupLabel}
                defaultCollapsed={group.defaultCollapsed ?? false}
                forceOpen={groupActive}
              >
                {group.items.map((item) => (
                  <NavLink
                    key={item.id}
                    href={item.href}
                    label={item.rawLabel ?? resolveNavLabel(tNav, item.label)}
                    stub={item.stub}
                    pathname={pathname}
                    basePath={config.basePath}
                  />
                ))}
              </CollapsibleGroup>
            );
          }

          return (
            <div key={group.id}>
              <div className="p-nav-divider">{resolvedGroupLabel}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  href={item.href}
                  label={item.rawLabel ?? resolveNavLabel(tNav, item.label)}
                  stub={item.stub}
                  pathname={pathname}
                  basePath={config.basePath}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-sidebar-foot">
        <Link href="/" className="p-foot-link">
          ↩ {tSidebar("publicSite")}
        </Link>
      </div>
    </aside>
  );
}

/** Resolve a translation key, falling back to the raw key if not found. */
function resolveNavLabel(t: ReturnType<typeof useTranslations>, key: string): string {
  if (!key) return "";
  try {
    return t(key as any);
  } catch {
    return key;
  }
}

function NavLink({
  href,
  label,
  stub,
  pathname,
  basePath
}: {
  href: string;
  label: string;
  stub?: boolean;
  pathname: string;
  basePath: string;
}) {
  const t = useTranslations("portalSidebar");
  const isActive =
    pathname === href || (href !== basePath && pathname.startsWith(`${href}/`));
  return (
    <Link href={href} className={`p-nav-item ${isActive ? "active" : ""}`}>
      <span className="p-nav-icon" aria-hidden>
        •
      </span>
      <span className="p-nav-label">{label}</span>
      {stub ? <span className="p-nav-badge">{t("stub")}</span> : null}
    </Link>
  );
}

function CollapsibleGroup({
  role,
  groupId,
  label,
  defaultCollapsed,
  forceOpen,
  children
}: {
  role: string;
  groupId: string;
  label: string;
  defaultCollapsed: boolean;
  forceOpen: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `nav.${role}.${groupId}`;
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "open") setCollapsed(false);
      else if (raw === "closed") setCollapsed(true);
    } catch {
      // localStorage may be unavailable (private mode, etc.)
    }
  }, [storageKey]);

  const open = forceOpen || !collapsed;

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "closed" : "open");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div>
      <button
        type="button"
        className="p-nav-divider p-nav-divider-toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`p-nav-group-${groupId}`}
      >
        <span>{label}</span>
        <span
          className={`p-nav-chevron ${open ? "open" : ""}`}
          aria-hidden
        >
          <Icon name="chevron-down" size={11} />
        </span>
      </button>
      {open ? (
        <div id={`p-nav-group-${groupId}`}>{children}</div>
      ) : null}
    </div>
  );
}
