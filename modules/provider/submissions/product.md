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

# Provider · Submissions module — Submission requests

## Purpose

Specify the **`/submissions` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every submission the active provider has lodged against the registry — active (pending or under review) and historical (approved, rejected, withdrawn).

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/submissions'` → `PROV_PAGES.ProvSubmissions`) |
| Page component (`ProvSubmissions`) | `portals/provider-pages.jsx` |
| Mock submissions (`PROV_SUBS`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Submissions"`
  - `breadcrumb=["Provider", "Publishing", "Submissions"]`
  - Active sidebar item: `Submissions` (`path: "/submissions"`, badge `2` from sidebar definition).

## Route body — vertical layout (`ProvSubmissions`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Submissions`
- **Subtitle:** `Your active and historical submission requests.`
- **Actions row:** none. New submissions originate from the `/publish` wizard.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `stage` | `Stage` | 130 | `<span class="p-tag">{stage}</span>` |
| `submitted` | `Submitted` | 120 | `<span class="p-mono-key">{submitted}</span>` |
| `age` | `Age` | 100 | `<span class="p-mono-val">{age}</span>` |
| `status` | `Status` | 130 | `<StatusPill status={cls}/>` where `cls = r.status === 'approved' ? 'verified' : r.status === 'review' ? 'review' : 'pending'` |

Rows bind to `P.subs` (no filtering, no sorting in v0.4). The table is **non-interactive** (no `onRowClick`).

## Status mapping (submission status → StatusPill)

The intrinsic `status` field uses `pending | review | approved | rejected | withdrawn`; the StatusPill rendered uses three visuals:

| Submission `status` | StatusPill visual |
|---|---|
| `approved` | `verified` |
| `review` | `review` |
| `pending` | `pending` |
| `rejected` | `pending` (default fallback in source — production should remap to `failed`) |
| `withdrawn` | `pending` (fallback) |

Production MUST persist the canonical enum; the UI mapping is purely visual. The fallback case for `rejected` and `withdrawn` is a v0.4 limitation; once the broader StatusPill catalogue includes a `failed` / `archived` visual, remap accordingly.

## Mock submissions — `PROV_SUBS`

Reproduce verbatim from `provider-data.jsx`:

| id | target | stage | submitted | status | age |
|---|---|---|---|---|---|
| s_001 | tool/lesson-search | sovereignty | 2026-05-07 | pending | 4h |
| s_002 | agent/curriculum-tutor v0.4.0 | safety | 2026-05-06 | review | 1d |
| s_003 | mcp/edu-curriculum v3.2.0 | evaluation | 2026-05-02 | approved | closed |

The dashboard's `Open submissions` right card surfaces the same data filtered to `status !== 'approved'` (and renders the raw status, not the mapped visual).

## Visual and motion

- StatusPill colours per global token map.
- Stage tag uses the same `p-tag` chip as elsewhere in the portal.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.
- Age cell `closed` is rendered verbatim; production should keep it as a sentinel for resolved (approved / rejected / withdrawn) submissions, NOT a duration string.

## Navigation behaviour

- Row click: not bound on this page; planned for production once a per-submission detail / decision-history route ships.

## Out of scope on this page

- New submission flow (lives at `/publish`).
- Reviewer comment threads (planned on detail route).
- Cross-portal links to verifier portal eval runs (planned).

## Differences vs admin/reviews

For implementers familiar with the admin module:

| Concern | Admin /reviews | Provider /submissions |
|---|---|---|
| Header primary | `New review` | (none) |
| StatCards | 3 (sovereignty / evaluation / safety) | (none) |
| `priority` column | yes (high / med / low pill) | no |
| `assigned` column | yes (reviewer email) | no |
| Status renderer | tag (raw `stage`) + pill (`high`/`med`) | StatusPill remapped from raw `status` |
| Sort | none | none |
| Click | non-interactive | non-interactive |
