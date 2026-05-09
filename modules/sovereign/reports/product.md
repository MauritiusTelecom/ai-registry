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

# Sovereign · Reports module — National-level reports

## Purpose

Specify the **`/reports` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists the formal reports issued by sovereign operations — quarterly sovereignty reviews, frontier-model annuals, sector audits — that the active authority publishes for cross-government and external readers.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/reports'` → `SOV_PAGES.SovReports`) |
| Page component (`SovReports`) + inline `reports` array | `portals/sovereign-pages.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

The `reports` array is **inline** in `SovReports` (not in `sovereign-data.jsx`). Production should move it to a server endpoint.

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Reports"`
  - `breadcrumb=["Sovereign", "Programmes", "Reports"]`
  - Active sidebar item: `Reports` (`path: "/reports"`).

## Route body — vertical layout (`SovReports`)

1. **PageHeader** (no actions row)
2. **Card grid** — `p-grid p-grid-2` of one card per report

This page does NOT use a `DataTable`. It uses a 2-column responsive card grid (similar pattern to `provider/docs` but with action buttons inside each card).

## Section copy and UI — PageHeader

- **Title:** `Reports`
- **Subtitle:** `National-level reports issued by sovereign operations.`
- **Actions row:** none. Report authoring lives outside this surface (planned).

## Section copy and UI — Report card

Each card is a `p-card` with two blocks:

1. **Card head** (`p-card-head`, flex row, space-between, baseline aligned):
   - **Left**: stacked title + sub
     - Title (`p-card-title`): `r.name`
     - Sub (`p-card-sub`): `issued ${r.issued}` (literal `issued ` prefix + ISO date)
   - **Right**: `<PIcon name="audit" size={18} />` (decorative icon)
2. **Action row** (`p-row` with `gap: 8, marginTop: 6`):
   - `<Btn variant="secondary" size="sm" icon="eye">View</Btn>`
   - `<Btn variant="ghost" size="sm" icon="arrow-up-right">Download</Btn>`

## Mock reports — inline in `SovReports`

Three rows hard-coded inline:

| id | name | issued |
|---|---|---|
| r1 | Q2 2026 — Sovereignty review | 2026-05-01 |
| r2 | External frontier model annual | 2026-04-15 |
| r3 | Health sector audit | 2026-04-29 |

The em dash in `Q2 2026 — Sovereignty review` is Unicode em dash U+2014.

## Visual and motion

- Card head font sizes: title is the standard `p-card-title`; sub is `p-card-sub`.
- Right-side `audit` icon is decorative — production must add `aria-hidden="true"`.
- Action buttons use `size="sm"` — smaller padding than default.
- Cards inherit the standard `p-card` gradient border and hover lift treatment.
- The 2-column grid collapses to single-column at narrow widths (per shared `p-grid-2` rules).

## Navigation behaviour

- `View` (per card secondary): no-op stub in prototype. Production opens a read-only inline viewer (HTML / iframe with the report PDF) in a new tab or modal.
- `Download` (per card ghost): no-op stub. Production triggers `GET /sovereign/reports/{id}/file.pdf` with a signed URL.

## Out of scope on this page

- Report authoring / publishing flow — production-only.
- Per-report comments / annotations.
- Versioned report history (each report on this page is a single-version artifact).
- Public surfacing — these reports may be partially mirrored on the public site, but that's a separate flow.
