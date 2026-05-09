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

# Provider · Resources module — My resources

## Purpose

Specify the **`/resources` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every resource the active provider has published, with status, tier, and per-resource performance metrics (7-day calls, p95 latency, error rate, last update).

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/resources'` → `PROV_PAGES.ProvResources`) |
| Page component (`ProvResources`) | `portals/provider-pages.jsx` |
| Mock catalogue (`PROV_RESOURCES`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="My resources"`
  - `breadcrumb=["Provider", "Publishing", "Resources"]`
  - Active sidebar item: `My resources` (`path: "/resources"`).

## Route body — vertical layout (`ProvResources`)

1. **PageHeader**
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4. The set of resources owned by a single provider is small enough that filters add no value.

## Section copy and UI — PageHeader

- **Title:** `My resources`
- **Subtitle (templated):** `Resources you publish under ${providerName}.`  
  In the prototype with the v0.4 mock data this resolves to `Resources you publish under eduMu.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Publish resource`

There is no secondary button — header has a single primary action.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `slug` | `Resource` | (auto) | Stack: top `slug` (strong); bottom `${kind} · ${version}` (`p-cell-meta`) |
| `status` | `Status` | 130 | `<StatusPill status={r.status}/>` |
| `sov` | `Tier` | 100 | `<span class="p-tag">{sov}</span>` |
| `usage` | `7d calls` | 100 | `<span class="p-mono-val">{usage}</span>` |
| `latency` | `p95` | 90 | `<span class="p-mono-val">{latency}</span>` |
| `errors` | `errors` | 90 | `<span class="p-mono-val">{errors}</span>` |
| `updated` | `Updated` | 110 | `<span class="p-mono-key">{updated}</span>` |

Rows bind to `P.resources`. The table passes `onRowClick={() => {}}` (a no-op) so rows are **non-interactive** in v0.4.

Note: the `errors` column label is **lowercase** `errors`, NOT `Errors` — preserve casing exactly.

## Mock catalogue — `PROV_RESOURCES`

Reproduce the 4 rows in `provider-data.jsx` verbatim:

| id | slug | kind | status | sov | updated | usage | latency | errors | version |
|---|---|---|---|---|---|---|---|---|---|
| p_001 | mcp/edu-curriculum | mcp-server | verified | Tier-1 | 2026-05-04 | 12.4k | 142ms | 0.04% | v3.2.0 |
| p_002 | tool/translate-mfe | tool | verified | Tier-1 | 2026-05-04 | 8.8k | 88ms | 0.01% | v2.1.0 |
| p_003 | agent/curriculum-tutor | agent | experimental | Tier-1 | 2026-05-06 | 320 | 1.2s | 2.1% | v0.4.0 |
| p_004 | tool/lesson-search | tool | draft | — | 2026-05-07 | — | — | — | v0.1.0 |

Note that `p_004` (the `draft` row) has `sov === '—'` and three `'—'` metric values; the StatusPill renders as `draft` per the global token map. Production must support the same `'—'` sentinel for unpublished or pre-launch resources.

## Visual and motion

- StatusPill colours per global token map (`verified`, `experimental`, `draft`, plus `review`, `isolated`, `archived` from the broader enum).
- Table row hover uses `var(--p-row-hover)`; without `onRowClick`, the cursor stays default.
- The `errors` cell does NOT colour-code by value (unlike admin's `risk` column). All values render in the standard `p-mono-val` tone. Production may add colour coding later (e.g. >1% = amber, >5% = red), but the prototype is uniform.
- The `latency` cell shows `1.2s` as a raw string; production must keep the unit suffix (`ms` / `s`) so readers don't have to parse magnitudes.

## Navigation behaviour

- `Publish resource` (header primary): `navigate('/publish')` — same as the dashboard's primary action and the sidebar `Publish` item.
- Row click: not bound; planned for production once a per-resource detail / editor route ships.

## Out of scope on this page

- Resource detail / editor (planned).
- Rollback to prior version (will live under detail).
- Per-resource analytics breakdown (lives at `/analytics`).

## Differences vs admin/resources

For implementers familiar with the admin module:

| Concern | Admin /resources | Provider /resources |
|---|---|---|
| Subtitle | Total count + kinds | `Resources you publish under ${providerName}.` |
| FilterBar | yes (q, kind, status) | no |
| Header secondaries | `Export CSV` | (none) |
| Row click | opens drawer | non-interactive |
| Columns | Resource, Status, Sovereignty, Region, Risk, 30d, Updated | Resource (with version meta), Status, Tier, 7d calls, p95, errors, Updated |
| Risk column | yes (colour-coded) | no |
| Region column | yes | no |
| Performance metrics | usage only | usage + p95 + errors |
