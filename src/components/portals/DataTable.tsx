import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  width?: string;
  mono?: boolean;
};

/**
 * Server-rendered data table for the portal list pages. Pure layout — the
 * caller passes already-projected rows. Empty state is rendered when `rows`
 * is empty.
 */
export function DataTable<T>({
  rows,
  columns,
  emptyState,
  keyOf
}: {
  rows: T[];
  columns: Column<T>[];
  emptyState: string;
  keyOf: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-empty">
        <div className="p-empty-text">{emptyState}</div>
      </div>
    );
  }
  return (
    <div className="p-table-wrap">
      <table className="p-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyOf(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.mono ? "mono" : undefined}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
