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

# Verifier · Reports module — Flows

## Routing

- Route lives at `/reports` of the verifier portal hash router.
- Activated via sidebar `Reports` (anchor `href="#/reports"`) or command palette.
- Active match: exact `'/reports'` OR `path.startsWith('/reports/')`.

## Initial render

1. App resolves `path === '/reports'` → renders `<VerReports/>`.
2. VerReports reads `V.reports` directly (no local state in prototype).
3. The `p-grid p-grid-2` paints synchronously with all 3 mock cards.
4. Each card with `r.signed === true` shows the green `signed` tag pushed to the right via `marginLeft: 'auto'`.
5. Production: emit `verifier.reports.viewed` after first paint with `totalCount` and `signedCount`.

## Header action

### Flow 1 — Draft report

- Click → no-op stub in v0.4.
- Production: open an authoring flow capturing `name` and `kind` (radio: quarterly / incident / annual). On submit → POST `/verifier/reports`. The new draft lands with `signed: false`. Cards with `signed === false` do NOT show the green tag.
- Emit `verifier.reports.action.draft_report.clicked` and `verifier.reports.draft.created`.

## Card action flows

### Flow 2 — View

- Click → no-op stub in v0.4.
- Production:
  - GET `/verifier/reports/{id}` to fetch a fresh signed URL.
  - Open the PDF in a new tab using the signed URL.
- Emit `verifier.reports.card.view.clicked` with `reportId`.

### Flow 3 — Download PDF

- Click → no-op stub in v0.4.
- Production: GET `/verifier/reports/{id}/file.pdf` with `Content-Disposition: attachment` and `Cache-Control: no-store`.
- Emit `verifier.reports.card.download.clicked`.

## Signing flow (production)

- Drafts (`signed === false`) need collegium sign-off before publication.
- Production-recommended:
  - From the report detail (planned drawer), each collegium member with `sovereignty-board` scope can co-sign via `POST /verifier/reports/{id}/sign`.
  - When the signature threshold is met, `signed` flips to `true` and the card surfaces the green tag.
  - Once signed, the report is IMMUTABLE — no further edits allowed.
- Emit `verifier.reports.report.signed` per signature.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `report.published`, `report.signed`. The grid updates in place.

## Empty / error states

- **No reports**: render the page with one full-width placeholder card `No reports yet. Draft the first.`
- **5xx** on the list endpoint: render PageHeader + a single full-width error card `Couldn't load reports.` with `Retry` button.
- **404 on download**: surface a toast `Report unavailable. Try again later.` and reset the button state.
- **Embargoed report**: the row still renders but the `View` and `Download PDF` buttons are disabled with tooltip `Embargoed until ${embargoUntil}.`
- **401/403** → redirect to verifier sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- A signed report MAY be mirrored on the public site (separate publication endpoint, out of scope here).
- Sovereign portal `/reports` and verifier portal `/reports` are DIFFERENT surfaces — the sovereign one is national-authority issued, the verifier one is collegium issued. Both can cross-link to the same source incident if relevant.

## Accessibility

- The `audit` icon top-right of each card is decorative; production must mark `aria-hidden="true"`.
- The green `signed` tag should expose `aria-label="signed by collegium"` so screen readers convey the meaning.
- Card title is the primary heading; production should mark with `<h3>` for clean traversal.
- Em dashes in titles should expose `aria-label` reading "mcp/health-records: special review" rather than the raw em-dash character.
