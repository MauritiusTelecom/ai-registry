/**
 * Status pill — colour-coded badge for portal tables.
 * Reuses the public-portal `.r-status` palette so badges feel consistent.
 */
export function StatusPill({
  status,
  label
}: {
  status: string;
  label?: string;
}) {
  return (
    <span className={`r-status ${status}`} style={{ fontSize: 11 }}>
      <span className="status-dot" />
      {label ?? status}
    </span>
  );
}
