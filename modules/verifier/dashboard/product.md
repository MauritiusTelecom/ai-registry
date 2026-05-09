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

# Verifier · Dashboard module — Verifier desk

## Purpose

Specify the **default verifier landing route** (`/`) of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This is the verifier collegium's working surface — independent sovereignty, evaluation, and safety review.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table, sidebar nav, command palette | `portals/verifier-app.jsx` |
| Page composition (`VerDashboard`) | `portals/verifier-pages.jsx` |
| Mock data (`V.queue`, `V.redteam`, …) | `portals/verifier-data.jsx` |
| Shared shell | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` props (from `verifier-app.jsx`):
  - `role="verifier"`
  - `portalLabel="Verifier"`
  - `portalIcon="check"`
  - `currentTitle="Dashboard"`
  - `breadcrumb=["Verifier", "Dashboard"]`

## Sidebar (`navItems`, in order)

1. `Dashboard` — icon `home`, path `/`
2. **Divider** label `Queue`
3. `Open reviews` — icon `inbox`, path `/queue`, badge `5`
4. `Decided` — icon `audit`, path `/decided`
5. **Divider** label `Evaluation`
6. `Benchmarks` — icon `database`, path `/benchmarks`
7. `Eval runs` — icon `activity`, path `/runs`
8. `Red-team` — icon `flag`, path `/redteam`, badge `2`
9. **Divider** label `Output`
10. `Reports` — icon `doc`, path `/reports`
11. `Settings` — icon `settings`, path `/settings`

## Command palette (⌘K) — verifier entries

`COMMANDS` in `verifier-app.jsx`:

- Pages: from NAV with `path`.
- Actions:
  - `Open next in queue` — icon `arrow-right`, path `/queue`
  - `Run benchmark` — icon `zap`, path `/runs`
- Go to:
  - `Public site` → `../Sovereign AI Registry.html`
  - `Admin portal` → `admin.html`

## Dashboard route — vertical layout (`VerDashboard`)

1. **PageHeader**
2. **StatCard grid** — 4 cards in `p-grid p-grid-4`, bottom margin 20
3. **Two-column split** — `p-grid p-grid-2` with `gridTemplateColumns: '2fr 1fr'`:
   - Left card: Top of queue (DataTable preview)
   - Right card: Active red-team (filtered list)

## Section copy and UI — PageHeader

- **Title:** `Verifier desk`
- **Subtitle:** `Independent sovereignty, evaluation and safety review for the registry.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="check"`): `Open next in queue`

## Section copy and UI — StatCard grid

| Label | Value | Delta | Tone | Sub | Icon |
|---|---|---|---|---|---|
| Open reviews | `V.queue.length` (5 in v0.4) | `+2` | `neg` | `awaiting` | `check` |
| Decided (30d) | `42` | `+6` | `pos` | `closed` | `audit` |
| Pass rate | `74%` | `-3pp` | `neg` | `rolling 30d` | `activity` |
| Open red-team | `count(redteam.status !== 'resolved')` (2 in v0.4) | `0` | `neu` | `findings` | `flag` |

The `Pass rate` delta uses the unit `pp` (percentage points) — production must keep the suffix.

## Section copy and UI — Top of queue card

- **Card head:**
  - Title: `Top of queue`
  - Sub: `SLA breach in red`
  - Right link (class `p-link`): `See all` → `#/queue`
- **DataTable:**
  | Key | Label | Width | Cell |
  |-----|-------|------:|------|
  | `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
  | `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
  | `stage` | `Stage` | 130 | `<span class="p-tag">{stage}</span>` |
  | `age` | `Age` | 80 | `<span class="p-mono-val" style={{color: r.age.endsWith('d') && parseInt(r.age) > 4 ? '#ef4444' : 'var(--p-text)'}}>{r.age}</span>` |
- **Rows:** `V.queue.slice(0, 4)`.

The `Age` cell colours red `#ef4444` when the age is `Nd` and `N > 4` — i.e. when the SLA (4 days) has been breached. Production must keep the SLA threshold of 4 days.

## Section copy and UI — Active red-team card

- **Card head:** title only `Active red-team`.
- **Body:** vertical flex stack, gap 10. Lists `V.redteam.filter(r => r.status !== 'resolved')`.
- Each row:
  - Strong line: `r.target` (fontSize 13)
  - Meta line (`p-cell-meta`): `r.vector` (e.g. `PII exfiltration via prompt injection`)
  - Right pill: `p-pill-isolated` for `severity === 'high'`, otherwise `p-pill-pending`.
  - Each row has 8px vertical padding and a 1px `var(--p-border-soft)` bottom border.
  - `alignItems: 'flex-start'` (so the pill aligns with the first text line, not centred).

In v0.4 the active red-team list shows:

1. `agent/citizen-helpdesk` — `PII exfiltration via prompt injection` — pill `high` (red)
2. `model/openai-gpt-6` — `Sovereignty boundary leak` — pill `high` (red)

(`agent/sugarcane-yield` is excluded because its status is `resolved`.)

## Visual and motion

- StatCards animate via `useCountUp` (1600ms) for purely-numeric values; compound strings (`74%`, `-3pp`) render statically.
- The `Age` cell colour is dynamically computed at render time per row — cross-reference admin's `/audit` row tone for similar approach.
- Cards inherit standard `p-card` gradient border and hover lift.

## Navigation behaviour from this page

- `Open next in queue` (header primary): in v0.4 the button has no onClick handler (no-op stub); production navigates to `#/queue` and selects the first row.
- `See all` (Top of queue): navigates to `#/queue`.
- Top of queue rows: NOT clickable in v0.4. Production should navigate to a per-review detail drawer.
- Active red-team rows: NOT clickable in v0.4. Production should navigate to per-finding detail.

## Out of scope on this page

- Per-review decision flow (lives at `/queue` row click → drawer in production).
- Benchmark execution UI (lives at `/benchmarks`).
- Per-report drafting (lives at `/reports`).
