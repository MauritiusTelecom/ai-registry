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

# Verifier · Reports module — Public-facing reports

## Purpose

Specify the **`/reports` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists the public-facing reports the verifier collegium has signed and published — quarterly sovereignty reviews, incident specials, frontier-model annuals.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/reports'` → `VER_PAGES.VerReports`) |
| Page component (`VerReports`) | `portals/verifier-pages.jsx` |
| Mock reports (`VER_REPORTS`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Reports"`
  - `breadcrumb=["Verifier", "Output", "Reports"]`
  - Active sidebar item: `Reports` (`path: "/reports"`).

## Route body — vertical layout (`VerReports`)

1. **PageHeader**
2. **Card grid** — `p-grid p-grid-2` of one card per report

This page does NOT use a `DataTable`. It uses a 2-column responsive card grid.

## Section copy and UI — PageHeader

- **Title:** `Reports`
- **Subtitle:** `Public-facing reports issued by the verifier collegium.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Draft report`

## Section copy and UI — Report card

Each card is a `p-card` with two blocks:

1. **Card head** (`p-card-head`, flex row, space-between, baseline aligned):
   - **Left**: stacked title + sub
     - Title (`p-card-title`): `r.name`
     - Sub (`p-card-sub`): `${r.kind} · issued ${r.issued}`
   - **Right**: `<PIcon name="audit" size={18} />` (decorative)
2. **Action row** (`p-row` with `gap: 8, marginTop: 6`):
   - `Btn variant="secondary" size="sm" icon="eye"`: `View`
   - `Btn variant="ghost" size="sm" icon="arrow-up-right"`: `Download PDF`
   - **Conditional** (`r.signed === true`): `<span class="p-tag" style={{marginLeft: 'auto', color: '#10b981'}}>signed</span>`

The `signed` tag pushes to the right via `marginLeft: 'auto'` and renders in green `#10b981`. v0.4 mock data has `signed: true` on every row, so the tag always appears in the prototype; production must conditionally render.

## Mock reports — `VER_REPORTS`

Reproduce verbatim from `verifier-data.jsx`:

| id | name | kind | issued | signed |
|---|---|---|---|---|
| rpt_2026_q2 | Q2 2026 sovereignty review | quarterly | 2026-05-01 | true |
| rpt_health_apr | mcp/health-records — special review | incident | 2026-04-29 | true |
| rpt_ext_models | External frontier models — annual | annual | 2026-04-15 | true |

The em dash in `mcp/health-records — special review` and `External frontier models — annual` is Unicode em dash U+2014.

## Visual and motion

- Card head font sizes: title is the standard `p-card-title`; sub composes `${kind} · issued ${issued}` in `p-card-sub`.
- Right-side `audit` icon at size 18 is decorative — production must add `aria-hidden="true"`.
- Action buttons use `size="sm"` — smaller padding than default.
- The `signed` tag is hard-green (`#10b981`) and pushed to the right via `marginLeft: 'auto'`.
- Cards inherit standard `p-card` gradient border and hover lift treatment.

## Navigation behaviour

- `Draft report` (header primary): no-op stub in v0.4. Production opens an authoring flow (out of scope for this module).
- `View` (per card secondary): no-op stub. Production fetches a fresh signed URL via `GET /verifier/reports/{id}` and opens the PDF in a new tab.
- `Download PDF` (per card ghost): no-op stub. Production triggers `GET /verifier/reports/{id}/file.pdf` with `Content-Disposition: attachment`.

## Out of scope on this page

- Report drafting / authoring — production-only (planned).
- Versioned report history — each row surfaces only the published version.
- Per-report digital-signature inspector — production should add a drawer that surfaces the signing key fingerprint and timestamp.
- Cross-publication mirroring (e.g. publishing the report to the public site simultaneously) — separate flow.

## Difference vs sovereign/reports

| Concern | Sovereign /reports | Verifier /reports |
|---|---|---|
| Header primary action | (none) | `Draft report` |
| Source | National authority issues these | Verifier collegium issues these |
| `kind` taxonomy | quarterly / annual / sector audit / etc. | quarterly / incident / annual |
| `signed` badge | implicit (sovereign authority signs all) | explicit (`signed` flag per row, with green tag) |
| Audience | Cross-government + external | Public-facing — provider operators, regulators, citizens |
