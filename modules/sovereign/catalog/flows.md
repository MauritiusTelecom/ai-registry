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

# Sovereign · Catalog module — Flows

## Routing

- Route lives at `/catalog` of the sovereign portal hash router.
- Activated via sidebar `Catalog` (anchor `href="#/catalog"`) or command palette.
- Active match: exact `'/catalog'` OR `path.startsWith('/catalog/')`.

## Initial render

1. `App` resolves `path === '/catalog'` → renders `<SovCatalog/>`.
2. `SovCatalog` reads `S.catalog` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 6 mock rows in document order.
4. Production: emit `sovereign.catalog.viewed` after first paint, including `tier1Count`, `tier3Count`, `highRiskCount` derived from the response.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Resource detail (sovereign view)` route ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - Tier classification reasoning (which policy assigned this tier and why).
  - Sector mapping (and any cross-sector dependencies).
  - Last DPIA outcome (date, decision, body).
  - Last review outcome (cross-link to admin's `/reviews` filtered by this resource id).
  - Cross-border call breakdown (for Tier-3 resources).

The drawer has NO write actions on the sovereign portal — sovereign-ops users cannot directly mutate resources; they observe and write reports / open incidents at higher routes.

## Filter (production)

- v0.4 has no filter. Production may add a small filter bar with kind / tier / sector / risk selects mirroring the API parameters. On change → refetch.
- Filter state SHOULD persist in URL query params for shareable links.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `resource.published`, `resource.tier_changed`, `resource.risk_changed`. Rows update in place with a subtle highlight.

## Empty / error states

- **No rows** (newly onboarded sovereign tenant): render the table chrome with one body row text `No registered resources yet. Onboard providers to populate the national catalog.`
- **5xx** → render chrome + body row `Couldn't load catalog.` and a top banner with `Retry`.
- **401/403** → redirect to sovereign sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- A row referenced here exists in admin's `/resources` (full record) and provider's `/resources` (provider-scoped projection). The same canonical `id` is used everywhere; cross-links from this drawer should use that id.

## Accessibility

- The `Risk` cell colour is paired with the uppercase letter text — accessible without colour.
- Mono columns MUST keep contrast ≥4.5:1 against `--p-card-bg` in both themes.
- Em dash `'—'` (U+2014) in the `usage` column should expose `aria-label="not applicable"` for screen readers.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
