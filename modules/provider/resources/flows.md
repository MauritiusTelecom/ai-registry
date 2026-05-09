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

# Provider · Resources module — Flows

## Routing

- Route lives at `/resources` of the provider portal hash router.
- Activated when sidebar item `My resources` is clicked (anchor `href="#/resources"`).
- Active match: exact `'/resources'` OR `path.startsWith('/resources/')`.

## Initial render

1. `App` resolves `path === '/resources'` → renders `<ProvResources/>`.
2. `ProvResources` reads `P.resources` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 4 mock rows in document order.
4. Production: emit `provider.resources.viewed` after first paint.

## Header action

### Flow 1 — Publish resource

- Click → `navigate('/publish')`.
- Same flow as the dashboard's primary action and the sidebar `Publish` item.
- Emit `provider.resources.action.publish_resource.clicked`.

## Row interaction (production)

The prototype DataTable passes `onRowClick={() => {}}` (a no-op). Once a `Provider resource detail` route ships:

- Row click → `navigate(/resources/{id})`.
- Detail page surfaces:
  - Full canonical `Resource` fields (description, region, risk classification).
  - Metric breakdown (per-day usage, p95 trend, error rate timeline).
  - Version timeline with publish dates.
  - Actions: `Edit description`, `Publish new version` (links to `/publish` with the slug pre-filled), `Archive` (status → `archived`), `Withdraw` (status → `draft`, only allowed from `experimental`).

## Status transitions visible on this page

- `draft → review` — happens when the provider submits via `/publish`.
- `review → verified | experimental | isolated` — driven by the registry review board (verifier portal).
- `verified → archived` — provider-initiated, requires confirmation.
- `* → isolated` — admin-initiated only; provider cannot self-recover.

The table reflects these transitions on next refresh; production should subscribe to `resource.status_changed` push events to update rows live.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `resource.status_changed`, `resource.published`, `resource.archived`.
  - Metrics columns (`usage`, `latency`, `errors`) refetch every 60s while visible.

## Empty / error states

- **No rows** (a brand-new provider): render the table chrome with a single body row text `No resources yet. Publish your first one to get started.` plus a CTA `Publish resource` linking to `#/publish`.
- **5xx** → render chrome + body row `Couldn't load resources.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- Mono columns (`usage`, `latency`, `errors`, `updated`) MUST keep contrast ≥4.5:1 against `--p-card-bg` in both themes.
- The column header `errors` is intentionally lowercase; production must keep the casing for visual consistency with the metric values which use `0.04%` style. If a tenant's locale would normally capitalise headers, consider a localisation override that respects the design intent.
- Em dash `'—'` (U+2014) used in `'—'` cells is read as "em dash" by screen readers; production should ensure each `'—'` cell has an ARIA label like `aria-label="not applicable"` so the meaning is explicit.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
