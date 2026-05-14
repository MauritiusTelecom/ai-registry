import type { ReactNode } from "react";

/**
 * Row of grid controls: search, filters, page-size selector, primary action.
 * Pure layout - the children are the actual controls (SearchInput, FilterChip,
 * Select, Button …).
 *
 *   <Toolbar
 *     left={<SearchInput value={q} onChange={setQ} />}
 *     filters={<>
 *       <FilterChip label="Status" value={status} options={…} onChange={setStatus} />
 *       <FilterChip label="Kind"   value={kind}   options={…} onChange={setKind} />
 *     </>}
 *     right={<Button intent="primary" leadingIcon="plus" onClick={openCreate}>Add new</Button>}
 *   />
 */
export function Toolbar({
  left,
  filters,
  right
}: {
  left?: ReactNode;
  filters?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      className="p-grid-toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 12
      }}
    >
      {left}
      {filters ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{filters}</div>
      ) : null}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}
