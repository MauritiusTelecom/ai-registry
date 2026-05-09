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

# Sovereign · Partners module — Flows

## Routing

- Route lives at `/partners` of the sovereign portal hash router.
- Activated via sidebar `Regional partners` (anchor `href="#/partners"`) or command palette.
- Active match: exact `'/partners'` OR `path.startsWith('/partners/')`.

## Initial render

1. App resolves `path === '/partners'` → renders `<SovPartners/>`.
2. SovPartners reads `S.partners` directly (no local state in prototype).
3. DataTable paints synchronously with all 3 mock rows in document order.
4. Production: emit `sovereign.partners.viewed` after first paint with `totalCount` and `pendingCount`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Partner detail` route or drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - The MOU PDF link (signed URL).
  - Contact roster (name, role, email).
  - Shared resources list (cross-link to `/catalog` filtered).
  - Bilateral incident log (cross-link to `/incidents` filtered to this partner).

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on `visibilitychange`. Partner relationships change rarely.

## Empty / error states

- **No rows** (no partner MOUs yet): render the table chrome with one body row text `No regional partners yet.`
- **5xx**: render chrome + body row `Couldn't load partners.` and a top banner with `Retry`.
- **401/403**: redirect to sovereign sign-in / "Insufficient permissions" empty.

## Pending MOUs

- Rows with `mou === 'pending'` render the literal sentinel in the MOU column. Production may add a small dashed-border treatment to visually distinguish them from signed MOUs, but the sentinel text MUST remain `pending` for accessibility and downstream filtering.
- A pending MOU MUST NOT have shared resources — the data invariant is enforced server-side; the UI shows `0` in the Shared resources column for pending rows.

## Cross-portal cross-references

- A partner that also publishes resources (e.g. `IndianOceanCom`) appears as a row in admin's `/providers` (`prv_iocom`) AND as a partner here. The two surfaces complement each other.
- Bilateral resource shares feed `modules/sovereign/catalog`'s region column (`MU/REGIONAL`).

## Accessibility

- Diacritics in partner names (e.g. `Madagascar Numérique`) MUST render as Unicode characters; production must NOT strip or transliterate.
- The `pending` sentinel should expose `aria-label="MOU pending"` for screen readers.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
