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

# Admin · Reviews module — Review queue

## Purpose

Specify the **`/reviews` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page presents the queue of submissions awaiting sovereignty, evaluation, or safety review, with stage breakdown counters and an assignee-aware table.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/reviews'` → `ADMIN_PAGES.AdminReviews`) |
| Page component (`AdminReviews`) | `portals/admin-pages.jsx` |
| Mock reviews (`ADMIN_REVIEWS`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatCard`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Review queue"`
  - `breadcrumb=["Admin", "Governance", "Reviews"]`
  - Active sidebar item: `Review queue` (`path: "/reviews"`, badge `14` from sidebar definition).

## Route body — vertical layout (`AdminReviews`)

1. **PageHeader**
2. **StatCard grid** — 3 cards in `p-grid p-grid-3`, bottom margin 20
3. **DataTable** — full width

There is no FilterBar on this page in v0.4. Production may add one (see `flows.md`).

## Section copy and UI — PageHeader

- **Title:** `Review queue`
- **Subtitle:** `Submissions awaiting sovereignty, evaluation or safety review.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `New review`

There is **no** secondary button on this page — header has a single primary action.

## Section copy and UI — StatCard grid

Three cards, each derived from a stage filter on `A.reviews`. Order is fixed.

| Label | Value | Sub | Icon | Filter |
|---|---|---|---|---|
| Sovereignty | `count(stage === 'sovereignty')` | `board review` | `shield` | `r.stage === 'sovereignty'` |
| Evaluation | `count(stage === 'evaluation')` | `benchmark` | `check` | `r.stage === 'evaluation'` |
| Safety | `count(stage === 'safety')` | `red-team` | `flag` | `r.stage === 'safety'` |

The StatCards on this page **do not** show deltas (no `delta`/`deltaTone`).

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `Review` | 110 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `stage` | `Stage` | 130 | `<span class="p-tag">{stage}</span>` |
| `priority` | `Priority` | 100 | `<span class="p-pill p-pill-{cls}"><span class="p-pill-dot"></span>{priority}</span>` where `cls = priority === 'high' ? 'isolated' : 'pending'` |
| `assigned` | `Assignee` | (auto) | text in `var(--p-text-3)` if `assigned === 'unassigned'`, otherwise `var(--p-text-2)` |
| `queued` | `Queued` | 110 | `<span class="p-mono-key">{queued}</span>` |
| `age` | `Age` | 80 | `<span class="p-mono-val">{age}</span>` |

Rows bind to `A.reviews` (no filtering, no sorting in v0.4). The table is **non-interactive** in the prototype (no `onRowClick` passed).

## Mock review queue — `ADMIN_REVIEWS`

Reproduce verbatim from `admin-data.jsx`:

| id | target | stage | priority | assigned | queued | age |
|---|---|---|---|---|---|---|
| rev_8821 | model/legal-fr-mu | sovereignty | high | sanjay@review.mu | 2026-05-06 | 1d |
| rev_8820 | agent/sugarcane-yield | evaluation | med | d.ramphul@mra.mu | 2026-05-05 | 2d |
| rev_8819 | agent/citizen-helpdesk | safety | med | sanjay@review.mu | 2026-05-04 | 3d |
| rev_8818 | model/openai-gpt-6 | sovereignty | high | unassigned | 2026-05-01 | 6d |

The badge `14` in the sidebar item is **NOT** derived from this list (which has 4 rows). It is a hard-coded copy in `admin-app.jsx` reflecting the wider queue. Production must compute the sidebar badge from the actual queue length and keep this number in sync with `total` returned by the list endpoint.

## Visual and motion

- StatCard counts animate via `useCountUp` (1600ms ease-out cubic) on first paint.
- Pill colour mapping (per `portal-styles.css`):
  - `p-pill-isolated` (high priority) → red
  - `p-pill-pending` (med priority) → amber
  - (low priority is not present in v0.4; if added, use `p-pill-draft`)
- The `Assignee` column tone differs by value: `unassigned` is muted (`--p-text-3`), assigned values use `--p-text-2`. This mirrors the source style.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- `New review` (header primary): no-op stub in prototype. Production opens a `New review` form (creator chooses target + stage).
- Row click: not bound on this page; planned for production once a review detail route ships.

## Out of scope on this page

- Review detail / decision UI (planned).
- Reviewer reassignment.
- Outcome publication (the immutable record lives in the audit log; `#/audit`).
