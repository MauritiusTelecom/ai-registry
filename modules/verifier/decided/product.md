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

# Verifier · Decided module — Decision history

## Purpose

Specify the **`/decided` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page is the verifier's read-only history of reviews already closed — approvals, rejections, and archive decisions.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/decided'` → `VER_PAGES.VerDecided`) |
| Page component (`VerDecided`) | `portals/verifier-pages.jsx` |
| Mock decisions (`VER_DECIDED`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Decided"`
  - `breadcrumb=["Verifier", "Queue", "Decided"]`
  - Active sidebar item: `Decided` (`path: "/decided"`).

## Route body — vertical layout (`VerDecided`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Decided reviews`
- **Subtitle:** `History of approvals, rejections and archive decisions.`
- **Actions row:** none. Decisions are immutable once made.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `decision` | `Decision` | 130 | `<StatusPill status={cls}/>` where `cls = decision === 'approved' ? 'verified' : decision === 'archived' ? 'archived' : 'rejected'` |
| `closed` | `Closed` | 110 | `<span class="p-mono-key">{closed}</span>` |
| `verifier` | `Verifier` | (auto) | text in `var(--p-text-2)` |

Rows bind to `V.decided`. The table is **non-interactive** (no `onRowClick` passed).

## Decision mapping (decision → StatusPill)

The intrinsic `decision` field uses `approved | rejected | withdrawn | archived`; the StatusPill rendered uses three visuals:

| `decision` | StatusPill visual |
|---|---|
| `approved` | `verified` |
| `archived` | `archived` |
| `rejected`, `withdrawn`, anything else | `rejected` |

Production MUST persist the canonical decision enum; the UI mapping is purely visual.

## Mock decisions — `VER_DECIDED`

Reproduce verbatim from `verifier-data.jsx`:

| id | target | decision | closed | verifier |
|---|---|---|---|---|
| rev_8810 | mcp/edu-curriculum | approved | 2026-05-04 | sanjay@review.mu |
| rev_8809 | tool/translate-mfe | approved | 2026-05-03 | d.ramphul@mra.mu |
| rev_8808 | mcp/elections-stats | archived | 2026-03-12 | sanjay@review.mu |
| rev_8807 | tool/ocr-creole | approved | 2026-05-01 | sanjay@review.mu |
| rev_8806 | agent/cargo-tracker | approved | 2026-04-29 | d.ramphul@mra.mu |

In v0.4 the corpus has 4 `approved` and 1 `archived`; no `rejected` rows. Production may surface `rejected` in the same column once the test corpus extends.

## Visual and motion

- Table rows do not show hover affordance because click is not bound.
- The Verifier column uses muted text (`var(--p-text-2)`) — distinct from the strong `Target` column, so the verifier identity reads as metadata rather than a primary identifier.
- StatusPill colour map per global token map (`verified`, `archived`, `rejected`).

## Navigation behaviour

- The page has no header actions and no row clicks in v0.4.
- Production may add row click → drawer with the full decision body, the original submission, attached eval runs / red-team findings, and the audit row id.

## Out of scope on this page

- Decision detail / drawer (planned).
- Re-review / appeal flow — out of scope for v0.4.
- Verifier-specific filtering (`assigned == me` only) — production may add a toggle to view the whole collegium's decisions vs the current actor's.
- Date-range filter — planned.

## Difference vs admin/audit and verifier/queue

| Concern | Admin /audit | Verifier /queue | Verifier /decided |
|---|---|---|---|
| Source | All ledger rows | Open reviews only | Closed reviews only |
| Header actions | Export + Verify | (none) | (none) |
| Status / decision rendering | StatusPill (verified / failed) | Priority pill | StatusPill (verified / archived / rejected) |
| Sig column | yes | no | no |
| Click | non-interactive | non-interactive (stub) | non-interactive |
