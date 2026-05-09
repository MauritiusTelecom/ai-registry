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

# Sovereign · Partners module — Regional partners

## Purpose

Specify the **`/partners` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists the regional partner authorities (Indian Ocean states + intergovernmental bodies) that the active sovereign tenant has formal MOUs with, along with the count of currently-shared resources.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/partners'` → `SOV_PAGES.SovPartners`) |
| Page component (`SovPartners`) | `portals/sovereign-pages.jsx` |
| Mock partners (`SOV_PARTNERS`) | `portals/sovereign-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Regional partners"`
  - `breadcrumb=["Sovereign", "Programmes", "Partners"]`
  - Active sidebar item: `Regional partners` (`path: "/partners"`).

## Route body — vertical layout (`SovPartners`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Regional partners`
- **Subtitle:** `MOUs and shared resources with Indian Ocean partners.`
- **Actions row:** none. Partner onboarding is admin-side.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Partner` | (auto) | `<span class="p-cell-strong">{name}</span>` |
| `kind` | `Kind` | 130 | `<span class="p-tag">{kind}</span>` |
| `resources` | `Shared resources` | 160 | `<span class="p-mono-val">{resources}</span>` |
| `mou` | `MOU` | 130 | `<span class="p-mono-key">{mou}</span>` |

Rows bind to `S.partners`. The table is **non-interactive** (no `onRowClick` passed).

## Mock partners — `SOV_PARTNERS`

Reproduce verbatim from `sovereign-data.jsx`:

| name | kind | resources | mou |
|---|---|---:|---|
| IndianOceanCom | regional | 1 | 2025-09-12 |
| Madagascar Numérique | regional | 0 | 2026-02-04 |
| Seychelles Digital | regional | 0 | pending |

The `Madagascar Numérique` name uses the French `é` (Unicode U+00E9). The `Seychelles Digital` row has the literal `pending` in the `mou` column instead of an ISO date — production must accept `pending` as a sentinel for partnerships in negotiation.

## Visual and motion

- The MOU column is mono-key styled because dates are typically short fixed-width strings; the `pending` sentinel renders in the same style for visual consistency.
- The Kind column uses the standard `p-tag` chip; in v0.4 every row is `regional`.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- The page has no header actions and no row clicks in v0.4.
- Production may add row click → drawer with the partner's MOU document, contact roster, and shared-resources list.

## Out of scope on this page

- MOU document storage / versioning — production-only (planned).
- Partner onboarding flow (admin-side).
- Bilateral resource sharing UI — provider-side flow exposes resources to specific regional partners; sovereign reads the result.
- Per-partner traffic / usage stats — could land as a fifth column once the per-partner aggregate is available.
