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

# Verifier · Runs module — Eval runs

## Purpose

Specify the **`/runs` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every benchmark run executed against registry resources, with score vs baseline and pass/fail.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/runs'` → `VER_PAGES.VerRuns`) |
| Page component (`VerRuns`) | `portals/verifier-pages.jsx` |
| Mock runs (`VER_RUNS`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Eval runs"`
  - `breadcrumb=["Verifier", "Evaluation", "Runs"]`
  - Active sidebar item: `Eval runs` (`path: "/runs"`).

## Route body — vertical layout (`VerRuns`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Eval runs`
- **Subtitle:** `Latest benchmark runs and their outcomes.`
- **Actions row:** none. Runs originate from the `Run` action on `/benchmarks`.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `Run` | 110 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `bench` | `Benchmark` | (auto) | `<span class="p-mono-val">{bench}</span>` |
| `score` | `Score` | 100 | `<span class="p-mono-val">{score.toFixed(2)}</span>` |
| `baseline` | `Baseline` | 100 | `<span class="p-mono-key">{baseline.toFixed(2)}</span>` |
| `status` | `Status` | 100 | `<StatusPill status={r.status === 'pass' ? 'verified' : 'failed'}/>` |
| `ran` | `Ran` | 160 | `<span class="p-mono-key">{ran}</span>` |

Rows bind to `V.runs`. The table is **non-interactive** (no `onRowClick` passed).

The `score` and `baseline` cells use `Number.toFixed(2)` formatting — so `0.74` renders as `0.74`, `0.62` as `0.62`, `0.85` as `0.85`. Production must keep two-decimal formatting.

## Mock runs — `VER_RUNS`

Reproduce verbatim from `verifier-data.jsx`:

| id | target | bench | score | baseline | status | ran |
|---|---|---|---:|---:|---|---|
| run_4421 | agent/sugarcane-yield | mu-legal-truth | 0.74 | 0.71 | pass | 2026-05-06 14:21 |
| run_4420 | agent/citizen-helpdesk | mauritian-context-safety | 0.62 | 0.80 | fail | 2026-05-06 12:08 |
| run_4419 | model/legal-fr-mu | mu-legal-truth | 0.81 | 0.71 | pass | 2026-05-06 09:55 |
| run_4418 | model/openai-gpt-6 | sov-egress-redteam | 0.49 | 0.85 | fail | 2026-05-05 18:33 |

In v0.4 the corpus has 2 `pass` runs and 2 `fail` runs. The dashboard's `Pass rate` StatCard (`74%`) is computed from a wider corpus (the v0.4 prototype corpus alone would give 50%).

## Pass / fail rule

- `status === 'pass'` ⇔ `score >= baseline`. Production should compute the pass/fail server-side; the UI just renders the persisted enum.
- The `failed` StatusPill maps the `fail` enum value to the registry's broader `failed` visual.

## Visual and motion

- Table rows do not show hover affordance because click is not bound.
- Score and baseline cells use mono fonts so digits align.
- StatusPill colour map per global token map (`verified` green, `failed` red).

## Navigation behaviour

- The page has no header actions and no row clicks in v0.4.
- Production may add row click → drawer with the per-item scores, the prompt outputs, and the rubric grading rationale.
- The `bench` column SHOULD link to `/benchmarks/{benchmarkId}` in production (cross-link).
- The `target` column SHOULD link to `/queue` filtered to the target slug, OR the public `/registry/{airId}` page.

## Out of scope on this page

- Per-item drill-down (planned).
- Run cancellation — once a run starts, it runs to completion.
- Re-run with a newer benchmark version — production may add a `Re-run with v…` action on the row drawer.
- Comparison view (side-by-side runs of the same target) — planned.
