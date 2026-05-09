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

# Sovereign · Reports module — Flows

## Routing

- Route lives at `/reports` of the sovereign portal hash router.
- Activated via sidebar `Reports` (anchor `href="#/reports"`) or command palette.
- Active match: exact `'/reports'` OR `path.startsWith('/reports/')`.

## Initial render

1. App resolves `path === '/reports'` → renders `<SovReports/>`.
2. SovReports renders the inline `reports` array (3 reports in v0.4).
3. The `p-grid p-grid-2` paints synchronously with all 3 cards.
4. Production: GET `/sovereign/reports` and emit `sovereign.reports.viewed` after first paint.

## Card action flows

### Flow 1 — View

- Click the `View` secondary button on a card.
- Prototype: no-op stub.
- Production:
  - GET `/sovereign/reports/{id}` to fetch a fresh signed URL.
  - Open the PDF in a new tab using the signed URL (`window.open(url, '_blank', 'noopener,noreferrer')`).
  - Alternatively: render the PDF inline in a modal viewer for tenants that prefer in-portal viewing.
- Emit `sovereign.reports.card.view.clicked` with `reportId`.

### Flow 2 — Download

- Click the `Download` ghost button on a card.
- Prototype: no-op stub.
- Production:
  - GET `/sovereign/reports/{id}/file.pdf` with the user's session.
  - The response includes `Content-Disposition: attachment` so the browser saves the file.
  - Cache-Control: `no-store` — never cache PDF bodies at the edge.
- Emit `sovereign.reports.card.download.clicked` and `sovereign.reports.file.downloaded` on 200.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `report.published` (a new report appears at the top of the grid).

## Empty / error states

- **No reports** (a brand-new sovereign tenant): render the page with one full-width placeholder card `No reports issued yet.`
- **5xx** on the list endpoint: render PageHeader + a single full-width error card `Couldn't load reports.` with `Retry` button.
- **404 on download**: surface a toast `Report unavailable. Try again later.` and reset the button state.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Accessibility

- The `audit` icon top-right of each card is decorative; production must mark `aria-hidden="true"`.
- Card title (the report name) is the primary heading; production should mark with `<h3>` or `aria-level="3"` so screen readers traverse cleanly.
- Em dashes in titles should expose `aria-label` reading "Q2 2026, Sovereignty review" rather than the raw em-dash character (production improvement).
- Buttons use `size="sm"` — ensure tap target is ≥40×40 dp on touch devices.

## Cross-portal cross-references

- The `Open national report` action on the Sovereign dashboard (`modules/sovereign/dashboard`) targets the **most recent** report — production should sort `rows` by `issued` desc and surface `rows[0].url` as the dashboard target.
- A report that documents an incident may cross-reference the originating row in `modules/sovereign/incidents`.
