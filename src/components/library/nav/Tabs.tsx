"use client";

import { useState, type ReactNode } from "react";

/**
 * Lightweight tab strip + panel pair. Uncontrolled by default; pass
 * `value`/`onChange` to control externally.
 *
 *   <Tabs
 *     items={[
 *       { id: 'overview', label: 'Overview', content: <Overview/> },
 *       { id: 'history',  label: 'History',  content: <History/> }
 *     ]}
 *   />
 */

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** Optional badge rendered next to the tab label (e.g. unread count). */
  badge?: ReactNode;
};

export function Tabs({
  items,
  value,
  onChange,
  defaultValue
}: {
  items: TabItem[];
  value?: string;
  onChange?: (next: string) => void;
  defaultValue?: string;
}) {
  const [internal, setInternal] = useState<string>(
    defaultValue ?? items[0]?.id ?? ""
  );
  const current = value ?? internal;
  const setCurrent = (id: string) => {
    if (onChange) onChange(id);
    else setInternal(id);
  };
  const active = items.find((i) => i.id === current);

  return (
    <div>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--border)",
          marginBottom: 16
        }}
      >
        {items.map((item) => {
          const isActive = item.id === current;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setCurrent(item.id)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${isActive ? "var(--primary)" : "transparent"}`,
                color: isActive ? "var(--text)" : "var(--text-2)",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "color 160ms, border-color 160ms"
              }}
            >
              {item.label}
              {item.badge ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "rgba(var(--primary-rgb), 0.16)",
                    color: "var(--primary)"
                  }}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  );
}
