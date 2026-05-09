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

# Sovereign · Incidents module — Flows

## Routing

- Route lives at `/incidents` of the sovereign portal hash router.
- Activated via sidebar `Incidents` (anchor `href="#/incidents"`) or command palette.
- Sidebar badge (`2` in v0.4 prototype) reflects `openCount`. Production must compute live.
- Active match: exact `'/incidents'` OR `path.startsWith('/incidents/')`.

## Initial render

1. App resolves `path === '/incidents'` → renders `<SovIncidents/>`.
2. SovIncidents reads `S.incidents` directly (no local state in prototype).
3. DataTable paints synchronously with all 2 mock rows in document order.
4. Production: emit `sovereign.incidents.viewed` after first paint with `totalCount` and `openCount`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Sovereign incident detail` route or drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - Cross-link to the originating `Flag` (admin) or `Incident` (provider) record.
  - Sector classification rationale.
  - Timeline of sovereign-side events (`escalated`, `reviewed`, `comment`, `dropped`, `resolved`).
  - Read-only audit trail.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `sovereign.incident.escalated`, `sovereign.incident.resolved`. The sidebar badge stays in sync.
  - High-severity incidents in `health` or `cross-cutting` sectors MAY trigger an in-app push notification.

## Empty / error states

- **No rows**: render the table chrome with one body row text `No national-impact incidents under sovereign oversight.`
- **5xx**: render chrome + body row `Couldn't load incidents.` and a top banner with `Retry`.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Accessibility

- Severity pill colour MUST be paired with the severity word.
- Sector tags use uniform `p-tag` colour; production may colour-code if useful.
- The `kind` column is free-form prose in muted text — production should ensure ≥4.5:1 contrast.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.

## Cross-portal cross-references

- Each row corresponds to either an admin `Flag` (`modules/admin/flags`) or a provider `Incident` (`modules/provider/incidents`). Production must surface both cross-links in the detail drawer.
- The Sovereign dashboard's `Open incidents` StatCard uses the same `openCount` as this page.
- The `health` sector incident (`inc_910`) is currently driving the `Health` row's `Restricted` tier on `/sectors`.
