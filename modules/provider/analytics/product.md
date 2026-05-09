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

# Provider · Analytics module — Traffic, latency, errors

## Purpose

Specify the **`/analytics` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page surfaces aggregate performance signals across all of the active provider's resources: 30-day call volume, p95 latency, error rate, and the same daily traffic chart used on the dashboard.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/analytics'` → `PROV_PAGES.ProvAnalytics`) |
| Page component (`ProvAnalytics`) + chart (`UsageChart`) | `portals/provider-pages.jsx` |
| Mock usage data (`PROV_USAGE`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `StatCard`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Analytics"`
  - `breadcrumb=["Provider", "Observe", "Analytics"]`
  - Active sidebar item: `Analytics` (`path: "/analytics"`).

## Route body — vertical layout (`ProvAnalytics`)

1. **PageHeader** (no actions row)
2. **StatCard grid** — 3 cards in `p-grid p-grid-3`, bottom margin 20
3. **Single chart card** — full-width `p-card` containing the same `UsageChart` rendered on the dashboard

## Section copy and UI — PageHeader

- **Title:** `Analytics`
- **Subtitle:** `Traffic, latency and error rates across your resources.`
- **Actions row:** none.

## Section copy and UI — StatCard grid

| Label | Value | Delta | Tone | Icon |
|---|---|---|---|---|
| Calls (30d) | `94.2k` | `+18%` | `pos` | `activity` |
| p95 latency | `142ms` | `-8ms` | `pos` | `pulse` |
| Error rate | `0.04%` | `0` | `neu` | `zap` |

The cards on this page **do not** carry a `sub` line (unlike the dashboard's StatCards which include `published`, `vs last 7d`, etc.). Production must preserve this — three values, three deltas, no sub captions.

Note that `p95 latency` shows a **negative ms delta as `pos`** because lower latency is better. Production must keep the inversion: smaller p95 = positive tone; larger p95 = negative tone.

## Section copy and UI — Daily traffic card

- **Card title:** `Daily traffic` (no sub line, no legend in the card head — different from the dashboard which has a sub `calls per resource kind` and a three-item legend).
- **Card body:** `UsageChart` (same SVG component as the dashboard's `Weekly traffic` card; see `modules/provider/dashboard/product.md` for chart geometry).

The lack of legend on this page is a v0.4 design choice; production may add one to clarify the colour mapping. If added, surface the same swatches (`mcp` square `var(--primary)`, `tool` square `var(--secondary)`, `agent` square `var(--tertiary)`).

## Visual and motion

- StatCards animate via `useCountUp` on first paint. Compound display strings like `94.2k`, `142ms`, `0.04%` render as static text — the count-up animates the numeric portion only (production-defined; the prototype renders the strings verbatim without count-up).
- The chart binds to the same `PROV_DATA.usage` array (length 7) as the dashboard. Production should switch the binding to a 30-day series for parity with the `Calls (30d)` StatCard; v0.4 reuses the 7-day mock for visual continuity.

## Navigation behaviour

- StatCards are **not** clickable in v0.4. Production may upgrade them to filter shortcuts (e.g. clicking `Calls (30d)` opens a deeper traffic explorer) but must emit a new `provider.analytics.statcard.clicked` event if so.
- The chart card is non-interactive; production may add hover tooltips per bar (recommended).

## Out of scope on this page

- Per-resource breakdown (planned).
- Per-region breakdown (planned).
- Cost analytics (sovereign-tier providers do not pay; this page is pure observability).

## Differences vs dashboard's `Weekly traffic` card

| Concern | Dashboard | Analytics |
|---|---|---|
| Card title | `Weekly traffic` | `Daily traffic` |
| Card sub | `calls per resource kind` | (none) |
| Legend | three swatches in head right | (none) |
| Series window | 7 days (matches `PROV_USAGE.length`) | 30 days (production); 7 days reused in v0.4 prototype |
| Chart geometry | identical (viewBox 0 0 720 220, padding 26, yMax 2500, agent×6 multiplier, square swatches in dashboard legend) | identical |
