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

# Sovereign · Sectors module — Flows

## Routing

- Route lives at `/sectors` of the sovereign portal hash router.
- Activated via sidebar `Sectors` (anchor `href="#/sectors"`) or command palette.
- Active match: exact `'/sectors'` OR `path.startsWith('/sectors/')`.

## Initial render

1. App resolves `path === '/sectors'` → renders `<SovSectors/>`.
2. SovSectors reads `S.sectors` directly (no local state in prototype).
3. The `p-grid p-grid-3` paints synchronously with all 6 cards.
4. Production: emit `sovereign.sectors.viewed` after first paint with `sectorCount` and `totalResources` (sum of `count`).

## Card interaction (production)

- v0.4 cards are non-interactive.
- Production-recommended:
  - Click a card → navigate to `/catalog?sector={name.toLowerCase()}`. The catalog page filters to that sector.
  - Hover surface: subtle 1px lift + brighter gradient border.
  - Emit `sovereign.sectors.card.clicked` with `name`.

## Per-sector sparkline (production)

- v0.4 cards have no series visualisation. Production may add a small inline sparkline (12px tall, 60px wide) inside each card head, between the title stack and the big number.
- Series source: `GET /sovereign/sectors/{name}/series?window=30d`.
- Hover the sparkline → tooltip with the day's count.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `resource.published` / `resource.archived` / `resource.tier_changed` — any of these can shift sector counts. Re-render the card with a subtle highlight on the changed sector.

## Empty / error states

- **No sectors** (impossible for a real tenant): render the page with a single full-width placeholder card `Sector taxonomy not configured.`
- **5xx**: render the page chrome with each card body showing `Couldn't load.` Top banner with `Retry`.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Accessibility

- Each card head has a `<h3>` (the sector name) and a sub label (the tier). Production should mark them with appropriate heading levels.
- The big number on the right is informational; production should pair it with `aria-label="${count} resources"` so screen readers don't read "4 Tier-1 +12%" as one stream.
- The growth value MUST pair colour with text — the `+12%` format already includes the sign explicitly, so screen readers convey the direction without colour.
- Cards are non-interactive in v0.4; do NOT set `tabindex="0"` until card click ships.

## Cross-portal cross-references

- A card on this page corresponds to a row in the dashboard's heatmap (`Edu`, `Fin`, `Health`, `Trade`, `Log`, `Agri`).
- Clicking through to `/catalog?sector=…` filters admin / sovereign catalogues by sector — production must wire both sides.
- A `Restricted` tier on the `Health` card cross-references admin `/flags` (the `mcp/health-records` `data-leak-risk` flag).
