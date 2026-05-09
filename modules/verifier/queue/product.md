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

# Verifier · Queue module — Open reviews

## Purpose

Specify the **`/queue` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page is the verifier's working list — every submission awaiting a decision, with priority pills and ageing.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/queue'` → `VER_PAGES.VerQueue`) |
| Page component (`VerQueue`) | `portals/verifier-pages.jsx` |
| Mock queue (`VER_QUEUE`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Review queue"`
  - `breadcrumb=["Verifier", "Queue", "Open"]`
  - Active sidebar item: `Open reviews` (`path: "/queue"`, badge `5`).

## Route body — vertical layout (`VerQueue`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4. The dashboard's Top-of-queue card surfaces the first 4 rows; this page is the full list.

## Section copy and UI — PageHeader

- **Title:** `Review queue`
- **Subtitle:** `Submissions awaiting your decision.`
- **Actions row:** none. Decisions live on the planned per-row drawer.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | Stack: top `target` (strong); bottom `${kind} · ${provider}` (`p-cell-meta`) |
| `stage` | `Stage` | 130 | `<span class="p-tag">{stage}</span>` |
| `priority` | `Priority` | 100 | `<span class="p-pill p-pill-{cls}"><span class="p-pill-dot"></span>{priority}</span>` where `cls = priority === 'high' ? 'isolated' : priority === 'med' ? 'pending' : 'draft'` |
| `queued` | `Queued` | 110 | `<span class="p-mono-key">{queued}</span>` |
| `age` | `Age` | 80 | `<span class="p-mono-val">{age}</span>` |

Rows bind to `V.queue`. The table passes `onRowClick={() => {}}` (a no-op stub) — rows are **non-interactive** in v0.4.

The `Age` cell on this page does NOT colour-code by SLA breach (unlike the dashboard's Top-of-queue preview). Production may add the same `parseInt(age) > 4` red treatment for visual consistency, but v0.4 keeps the cell uniform.

## Mock queue — `VER_QUEUE`

Reproduce verbatim from `verifier-data.jsx`:

| id | target | kind | stage | priority | queued | age | provider |
|---|---|---|---|---|---|---|---|
| rev_8821 | model/legal-fr-mu | model | sovereignty | high | 2026-05-06 | 1d | JusticeMU |
| rev_8820 | agent/sugarcane-yield | agent | evaluation | med | 2026-05-05 | 2d | AgriMU |
| rev_8819 | agent/citizen-helpdesk | agent | safety | med | 2026-05-04 | 3d | pmo.gov.mu |
| rev_8818 | model/openai-gpt-6 | model | sovereignty | high | 2026-05-01 | 6d | openai.com |
| rev_8817 | mcp/customs-tariff v2 | mcp-server | evaluation | low | 2026-05-04 | 3d | MRA |

The `mcp/customs-tariff v2` target uses a single space between the slug and the SemVer suffix. The badge `5` in the sidebar reflects this row count.

## Visual and motion

- Rows pass `onRowClick={() => {}}` (no-op stub) — production must keep this until a per-row drawer ships, then upgrade to a real handler.
- Priority pill colour map: high → red (`p-pill-isolated`), med → amber (`p-pill-pending`), low → muted (`p-pill-draft`).
- The Target cell uses the standard `p-cell-stack` (strong over meta) pattern.

## Navigation behaviour

- The dashboard's `Open next in queue` button (production) navigates here and selects the first row.
- Row click: not bound on this page in v0.4. Production should open a right-anchored drawer with the full submission detail and the decision actions (Approve / Reject / Withdraw / Comment).

## Out of scope on this page

- The decision flow (drawer with Approve / Reject / Withdraw / Comment buttons) — planned for production.
- Filtering by stage / priority / provider — production should add a small filter bar above the table.
- Bulk operations (e.g. "Reassign all from this provider to me") — out of scope for v0.4.

## Difference vs admin/reviews

For implementers familiar with the admin module:

| Concern | Admin /reviews | Verifier /queue |
|---|---|---|
| Header primary action | `New review` | (none) |
| StatCards | 3 (Sovereignty / Evaluation / Safety counts) | (none) |
| Target cell | strong only | stack with `${kind} · ${provider}` meta |
| `assigned` column | yes | no (this is the verifier's own queue) |
| `age` SLA colour | no | no on this page (yes on the dashboard preview) |
| Click | non-interactive | non-interactive in v0.4; planned drawer in production |
