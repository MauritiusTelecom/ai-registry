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

# Sovereign · Risk module — Composite risk index

## Purpose

Specify the **`/risk` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page surfaces the composite sovereign risk index over time AND the sector × tier coverage matrix that contributes to it. The two visualisations are the same components used on the Sovereign dashboard, here laid out side-by-side as the dedicated risk surface.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/risk'` → `SOV_PAGES.SovRisk`) |
| Page component (`SovRisk`) | `portals/sovereign-pages.jsx` |
| `RiskTimelineCard`, `HeatmapCard` (shared with dashboard) | `portals/sovereign-pages.jsx` |
| Mock data (`SOV_RISK`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Risk"`
  - `breadcrumb=["Sovereign", "Governance", "Risk"]`
  - Active sidebar item: `Risk` (`path: "/risk"`).

## Route body — vertical layout (`SovRisk`)

1. **PageHeader** (no actions row)
2. **Two-column row** — `p-grid p-grid-2`:
   - Left card: `RiskTimelineCard`
   - Right card: `HeatmapCard`

There are **no StatCards** and **no DataTable** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Risk`
- **Subtitle:** `Composite risk index and contributing factors.`
- **Actions row:** none.

## Section copy and UI — RiskTimelineCard

Same component as the Sovereign dashboard. Cross-reference `modules/sovereign/dashboard/product.md` (RiskTimelineCard section) for full geometry, mock data, and visual tokens.

Summary recap:

- **Card title:** `Sovereign risk index`
- **Card sub:** `composite · weekly · lower is better`
- **Right-side big number:** the most recent week's score (`27` in v0.4)
- Inline SVG (`viewBox 0 0 720 220`, padding 30): 5 horizontal grid lines, filled area path under the line, stroked line on top, per-week dots + day labels.
- y-axis ceiling `max = 50`.

## Section copy and UI — HeatmapCard

Same component as the Sovereign dashboard. Cross-reference `modules/sovereign/dashboard/product.md` (HeatmapCard section) for the full geometry.

Summary recap:

- **Card title:** `Sector × tier coverage`
- **Card sub:** `resource counts`
- **Grid:** 5-col `60px repeat(4, 1fr)`, gap 4, `marginTop: 8`
- **Body cells:** 6 sectors × 4 tiers; alpha gradient `rgba(var(--primary-rgb), 0.15 + (v/max)*0.6)` for non-zero cells; `var(--p-input)` for zero cells (rendering literal `·`).

## Mock data — `SOV_RISK`

Reproduce verbatim from `sovereign-data.jsx`:

| day | score |
|---|---:|
| Apr 09 | 22 |
| Apr 16 | 19 |
| Apr 23 | 24 |
| Apr 30 | 31 |
| May 07 | 27 |

Heatmap cells reproduced from the dashboard's `HeatmapCard` (see `modules/sovereign/dashboard/data-model.md`).

## Visual and motion

- The page is a stripped-down version of the dashboard's bottom row: same two cards, same components, same data, no top stat strip.
- Both cards inherit the standard `p-card` gradient border and hover lift treatment.
- The 2-column grid collapses to single-column at narrow widths (per shared `p-grid-2` rules).
- The cards do not animate on mount in v0.4; production may add a subtle reveal.

## Navigation behaviour

- The cards are **not interactive** in v0.4. Production may add:
  - Hover a risk-timeline point → tooltip with `day + score + delta vs prior`. Click → drill into that week's events.
  - Hover a heatmap cell → tooltip with `sector + tier + count`. Click → navigate to `/catalog?sector={sector}&tier={tier}`.

## Out of scope on this page

- Per-incident risk breakdown — that lives on `/incidents`.
- Per-policy contribution — production may add a "Contributing policies" panel showing which policies most influence the composite score.
- Risk methodology documentation — published separately under `airegistry-specs/governance/`.
