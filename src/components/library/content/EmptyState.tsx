import type { ReactNode } from "react";
import { Icon, type IconName } from "../chrome/Icon";

/**
 * Standardised empty-state block. Replaces the
 *
 *   <div className="p-empty"><div className="p-empty-text">…</div></div>
 *
 * pattern repeated in the portal data tables. Two variants:
 *   - `compact` (default): a single line of muted text inside the `.p-empty` frame.
 *   - `rich`: a centred block with optional icon, title, body, and action.
 *
 * The compact variant matches what `DataTable` / `FilteredDataTable` render
 * today so callers can drop in `<EmptyState text="…" />` without visual drift.
 */

export function EmptyState({
  text,
  icon,
  title,
  body,
  action
}: {
  /** Compact mode: single-line text. Mutually exclusive with `title`/`body`. */
  text?: ReactNode;
  /** Rich mode: optional decorative icon. */
  icon?: IconName;
  /** Rich mode: bold heading. Activates rich mode when present. */
  title?: ReactNode;
  /** Rich mode: paragraph below the title. */
  body?: ReactNode;
  /** Rich mode: action slot (button, link). */
  action?: ReactNode;
}) {
  if (title || body || action || icon) {
    return (
      <div
        className="p-empty"
        style={{
          textAlign: "center",
          padding: "40px 24px",
          display: "grid",
          gap: 10,
          justifyItems: "center"
        }}
      >
        {icon ? (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "rgba(var(--primary-rgb), 0.10)",
              color: "var(--primary)",
              border: "1px solid var(--border)"
            }}
          >
            <Icon name={icon} size={20} stroke={1.6} />
          </div>
        ) : null}
        {title ? (
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>
            {title}
          </div>
        ) : null}
        {body ? (
          <div style={{ color: "var(--text-2)", fontSize: 13.5, maxWidth: 420 }}>
            {body}
          </div>
        ) : null}
        {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
      </div>
    );
  }
  return (
    <div className="p-empty">
      <div className="p-empty-text">{text}</div>
    </div>
  );
}
