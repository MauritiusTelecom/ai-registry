<!--
 Copyright 2026 rakesh.khoodeeram

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# Admin · Audit module — Flows

## Routing

- Route lives at `/audit` of the admin portal hash router.
- Activated when sidebar item `Audit log` is clicked (anchor `href="#/audit"`).
- Also reachable from the dashboard's `Recent activity` card right link `Open audit log`.
- Active match: exact `'/audit'` OR `path.startsWith('/audit/')`.

## Initial render

1. `AdminApp` resolves `path === '/audit'` → renders `<AdminAudit/>`.
2. `AdminAudit` reads `A.audit` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 10 mock rows in document order (newest first).
4. Production: emit `admin.audit.viewed` after first paint, including `asOfBlock` so subsequent verify operations bound their range correctly.

## Header action flows

### Flow 1 — Export

- Click → no-op stub in prototype.
- Production: open a small dropdown beneath the button offering format choice (`CSV`, `JSON Lines`). On selection:
  - `CSV` → GET `/admin/audit/export.csv?from=...&to=...` with current filter range; browser downloads via `Content-Disposition: attachment`.
  - `JSON Lines` → GET `/admin/audit/export.jsonl?...` (full signatures included).
- Default range: last 30 days. Production must surface a date-range picker if filters become available.
- Emit `admin.audit.action.export.clicked` with `format`.

### Flow 2 — Verify integrity

- Click → no-op stub in prototype.
- Production:
  1. Show toast `Verifying integrity…` with a spinner.
  2. POST `/admin/audit/verify`. Server returns 202 with `jobId`, `since`, `until`.
  3. Poll `GET /admin/audit/verify/{jobId}` every 1.5s.
  4. On `state === 'ok'`: toast updates to `Integrity verified through ${scannedThrough}` (success).
  5. On `state === 'mismatch'`: toast updates to red `Mismatch at ${mismatchAt} — incident opened` and an audit incident is created server-side.
  6. On `state === 'error'`: toast updates to red `Verification failed — try again`. The job may be safely re-run.
- Emit `admin.audit.verify.started` on 202 and `admin.audit.verify.completed` on terminal state.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Record detail / signature inspector` route ships:

- Row click → `navigate(/audit/{id})`.
- Detail page surfaces:
  - Full signature (`sigFull`) and signing key fingerprint
  - Block id and inclusion proof path
  - Pretty-printed payload (the original action body)
  - "Open target" CTA (resolves `target` to its native route, e.g. resource slug → `/resources` filtered to that slug)

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Subscribe to a tenant-scoped WebSocket. New audit rows arrive as push events; the table prepends with a subtle highlight animation per shell convention.
  - On visibility change, refetch from the most recent known `id` cursor.
  - The dashboard's `Recent activity` preview shares the same source; both stay in sync.

## Empty / error states

- **No rows in current filter:** render the table chrome with one body row text `No audit records in this range.`
- **5xx:** render chrome + body row `Couldn't load audit log.` and a top banner with `Retry`.
- **401/403:** redirect to admin sign-in / "Insufficient permissions" empty.
- **Verify mismatch:** the toast persists until acknowledged; clicking it opens the incident (cross-link out of scope here).

## Accessibility

- Result column pairs colour with the StatusPill word; accessible without colour.
- Mono columns (`id`, `ts`, `action`, `target`, `sig`) MUST keep contrast ≥4.5:1 against `--p-card-bg` in both dark and light themes.
- Truncated signature uses Unicode horizontal ellipsis (U+2026); production must keep this character so screen readers announce it consistently.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
