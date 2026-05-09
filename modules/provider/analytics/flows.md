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

# Provider · Analytics module — Flows

## Routing

- Route lives at `/analytics` of the provider portal hash router.
- Activated via sidebar `Analytics` (anchor `href="#/analytics"`) or command palette.
- Active match: exact `'/analytics'` OR `path.startsWith('/analytics/')`.

## Initial render

1. `App` resolves `path === '/analytics'` → renders `<ProvAnalytics/>`.
2. `ProvAnalytics` reads from in-memory state in the prototype; production should `GET /provider/analytics?window=30d` and surface a skeleton during fetch.
3. PageHeader, three StatCards, and the chart card paint synchronously.
4. StatCards animate via `useCountUp` if production wires the numeric portion (the prototype renders the strings verbatim).
5. Emit `provider.analytics.viewed` with `window: '30d'` after first paint.

## Window selector (production)

- The prototype shows a single 30d view with no selector.
- Production-recommended: a small segmented control in the header next to the title — `7d | 30d | 90d`. On change → refetch with the new `window` param.
- Emit `provider.analytics.window.changed` on transition.

## StatCard interaction (production)

- StatCards are not clickable in v0.4. Production may upgrade them:
  - Click `Calls (30d)` → drawer / page that shows the calls breakdown (`GET /provider/analytics/calls`).
  - Click `p95 latency` → latency drill-down (`GET /provider/analytics/latency`).
  - Click `Error rate` → errors breakdown (`GET /provider/analytics/errors`).
- If implemented, surface a hover ring and emit `provider.analytics.statcard.clicked`.

## Chart interaction

- Bars are non-interactive in v0.4.
- Production-recommended: hover tooltip per day showing `mcp / tool / agent` raw values plus the day total. Click on a bar opens a per-day breakdown.
- Use the same `UsageChart` SVG renderer as the dashboard so visual regression tests cover both pages with one snapshot.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Server caches the analytics payload for 60s; the SPA may treat the cache as authoritative for that window.
  - On a 30d window the StatCards do not change minute-to-minute; production may refresh hourly.

## Empty / error states

- **No traffic in window** (e.g. brand-new provider): render the StatCards with `0` / `—` values and the chart card body with `No traffic in this window. Publish a resource to start seeing usage.`
- **5xx** → render PageHeader and replace each card body with `Couldn't load`. Top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Cross-portal links

- Anywhere on this page that surfaces a per-resource breakdown should link back to `/resources/{id}` for the resource detail. v0.4 has no such breakdown surfaced, so the cross-link is reserved.
- The chart's day labels are not clickable in v0.4.

## Accessibility

- StatCards expose values as `role="status"` (live regions) so refetches announce changes.
- Tone colour (`pos`/`neg`/`neu`) MUST be paired with a textual delta (already present); never rely on colour alone.
- Chart bars in production should expose `aria-label` per bar describing day + kind + count, so screen readers can summarise the picture.
