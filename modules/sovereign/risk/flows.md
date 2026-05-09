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

# Sovereign · Risk module — Flows

## Routing

- Route lives at `/risk` of the sovereign portal hash router.
- Activated via sidebar `Risk` (anchor `href="#/risk"`) or command palette.
- Active match: exact `'/risk'` OR `path.startsWith('/risk/')`.

## Initial render

1. App resolves `path === '/risk'` → renders `<SovRisk/>`.
2. SovRisk renders PageHeader → 2-column row → RiskTimelineCard (left) + HeatmapCard (right).
3. Both cards use the same hard-coded mock data sources as the dashboard.
4. Production: emit `sovereign.risk.viewed` after first paint with `latestScore` (the most recent `score`) and `weekCount`.

## Per-card interaction (production)

### Flow 1 — RiskTimelineCard hover / click

- v0.4: not interactive.
- Production-recommended:
  - Hover a point → tooltip with `day`, `score`, and signed delta vs prior week (e.g. `+4`, `-2`).
  - Click a point → fetch `GET /sovereign/risk/week/{day}` and open a side drawer with the `contributors` breakdown.
  - Emit `sovereign.risk.week.hovered` on hover; `sovereign.risk.week.clicked` on click.

### Flow 2 — HeatmapCard hover / click

- v0.4: not interactive.
- Production-recommended:
  - Hover a cell → tooltip with full sector + tier label and count.
  - Click a cell → navigate to `/catalog?sector={sector}&tier={tier}`.
  - Emit `sovereign.risk.heatmap.cell.hovered` on hover.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `risk.weekly_recomputed` (refreshes the timeline), `resource.tier_changed` (may shift the heatmap).

## Empty / error states

- **No risk history yet** (a brand-new sovereign tenant): render the timeline card with body line `No risk history yet — first weekly score arrives at the end of the cycle.` Render the heatmap with all `·` placeholder cells.
- **5xx**: render the page chrome with both card bodies showing `Couldn't load.` Top banner with `Retry`.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- The risk timeline contributors include `incident`, `policy-violation`, `flag`, `review-backlog`, `cross-border`. Each cross-references a different module:
  - `incident` → `modules/sovereign/incidents`
  - `policy-violation` → `modules/admin/policies`
  - `flag` → `modules/admin/flags`
  - `review-backlog` → `modules/admin/reviews`
  - `cross-border` → `modules/sovereign/dashboard` (Cross-border calls StatCard)
- The heatmap cells link back to `modules/sovereign/catalog` filtered by sector + tier.
