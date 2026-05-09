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

# Admin · Providers module — Provider entities browse

## Purpose

Specify the **`/providers` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every entity that publishes resources to the registry — sovereign government bodies, regional partners, domestic privates, and external frontier vendors.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/providers'` → `ADMIN_PAGES.AdminProviders`) |
| Page component (`AdminProviders`) | `portals/admin-pages.jsx` |
| Mock providers (`ADMIN_PROVIDERS`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `FilterBar`, `DataTable`, `StatCard`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Providers"`
  - `breadcrumb=["Admin", "Registry", "Providers"]`
  - Active sidebar item: `Providers` (`path: "/providers"`).

## Route body — vertical layout (`AdminProviders`)

1. **PageHeader**
2. **StatCard grid** — 4 cards in `p-grid p-grid-4`, bottom margin 20
3. **FilterBar**
4. **DataTable**

## Section copy and UI — PageHeader

- **Title:** `Providers`
- **Subtitle (templated):** `${A.providers.length} entities — sovereign, regional, private and external.`  
  In the prototype with the v0.4 mock data this resolves to `10 entities — sovereign, regional, private and external.`
- **Actions row:**
  - Secondary button (`Btn variant="secondary" icon="arrow-up-right"`): `Onboarding queue`
  - Primary button (`Btn variant="primary" icon="plus"`): `Add provider`

## Section copy and UI — StatCard grid

Four cards, each derived from a `filter` over `A.providers`. Order is fixed.

| Label | Value | Sub | Icon | Filter |
|---|---|---|---|---|
| Sovereign | `count(kind === 'sovereign')` | `gov entities` | `shield` | `p.kind === 'sovereign'` |
| Regional | `count(kind === 'regional')` | `ioc partners` | `globe` | `p.kind === 'regional'` |
| Private | `count(kind === 'private')` | `domestic` | `layers` | `p.kind === 'private'` |
| External | `count(kind === 'external')` | `frontier vendors` | `zap` | `p.kind === 'external'` |

The StatCards on this page **do not** show deltas (no `delta`/`deltaTone`/sub-period). They are headline counters only.

## Section copy and UI — FilterBar

1. **Search input** — placeholder `Search providers…`, bound to `q`, `minWidth: 280`.
2. **Kind select** — bound to `kind`, default `all`. Options:
   - `All kinds` · `all`
   - `Sovereign` · `sovereign`
   - `Regional` · `regional`
   - `Private` · `private`
   - `External` · `external`
3. **Count chip** — right-aligned mono `${filtered.length} entities` (note: this page renders the word `entities`, not the `${filtered} of ${total}` template used on `/resources`).

Filter logic:

```js
filtered = A.providers.filter(p =>
  (kind === 'all' || p.kind === kind) &&
  (!q || p.name.toLowerCase().includes(q.toLowerCase()))
);
```

Note: search is **case-insensitive on `name`** (lowercased both sides). `domain` is not searched.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Provider` | (auto) | Stack: top `name` (strong); bottom `${domain} · ${kind}` (`p-cell-meta`) |
| `tier` | `Tier` | 120 | `<span class="p-tag">{tier}</span>` |
| `resources` | `Resources` | 100 | `<span class="p-mono-val">{resources}</span>` |
| `primary` | `Primary contact` | (auto) | text in `var(--p-text-2)` |
| `status` | `Status` | 130 | `<StatusPill status={p.status}/>` |
| `verified` | `Verified` | 110 | `<span class="p-mono-key">{verified}</span>` |

Rows are bound to `filtered`. The prototype passes `onRowClick={() => {}}` (a no-op) so rows are **non-interactive** in v0.4 — production must keep this until a provider detail route ships.

## Mock providers — `ADMIN_PROVIDERS`

10 rows in the v0.4 prototype; reproduce verbatim. Names: `eduMu`, `finance.gov.mu`, `anthropic.com`, `openai.com`, `MoH-Mauritius`, `IslandLabs`, `PortLouisLogistics`, `MRA`, `AgriMU`, `IndianOceanCom`. Field shapes documented in `data-model.md`.

## Visual and motion

- StatCard count uses `useCountUp` (1600ms, ease-out cubic) — see `portal-shell.jsx`. The four counts animate on first paint.
- DataTable hover row uses `var(--p-row-hover)`; without `onRowClick`, the cursor stays default.
- Sovereign / Regional / Private / External StatCards use the same gradient border treatment as the dashboard.

## Navigation behaviour

- `Onboarding queue` (header secondary): no-op stub; production opens an onboarding board (out of scope in this module).
- `Add provider` (header primary): no-op stub; production opens a creation flow (out of scope).
- Row interaction: none on this page.

## Out of scope on this page

- Provider detail / drawer (planned).
- Provider onboarding wizard.
- Provider re-verification (lives at the resource level).
