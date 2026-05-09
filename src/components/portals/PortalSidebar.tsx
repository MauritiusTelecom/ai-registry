"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { PortalConfig } from "@/lib/portals/nav-config";

/**
 * Sidebar (client component for active-link highlighting).
 * Mirrors the prototype's `Sidebar` shape but uses Next.js routing instead
 * of the hash router.
 */
export function PortalSidebar({ config }: { config: PortalConfig }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(true);

  return (
    <aside className={`p-sidebar ${open ? "" : "collapsed"}`}>
      <div className="p-sidebar-head">
        <Link href="/" className="p-logo">
          <span className="p-logo-mark" />
          <div className="p-logo-text">
            <span className="p-logo-name">AI Registry</span>
            <span className="p-logo-sub">{config.label}</span>
          </div>
        </Link>
        <button
          type="button"
          className="p-sidebar-toggle"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      <nav className="p-nav">
        {config.groups.map((group) => (
          <div key={group.id}>
            <div className="p-nav-divider">{group.label}</div>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== config.basePath && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`p-nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="p-nav-icon" aria-hidden>
                    •
                  </span>
                  <span className="p-nav-label">{item.label}</span>
                  {item.stub ? <span className="p-nav-badge">stub</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-sidebar-foot">
        <Link href="/" className="p-foot-link">
          ↩ Public site
        </Link>
      </div>
    </aside>
  );
}
