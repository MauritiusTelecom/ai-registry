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

# Verifier · Runs module — Flows

## Routing

- Route lives at `/runs` of the verifier portal hash router.
- Activated via:
  - Sidebar `Eval runs` (anchor `href="#/runs"`).
  - Command palette `Run benchmark` action (which navigates here AND opens the run modal).
  - Cross-link from `/benchmarks` after a `Run` action lands a new row.
- Active match: exact `'/runs'` OR `path.startsWith('/runs/')`.

## Initial render

1. App resolves `path === '/runs'` → renders `<VerRuns/>`.
2. VerRuns reads `V.runs` directly (no local state in prototype).
3. DataTable paints synchronously with all 4 mock rows in document order (newest first by `ran`).
4. Production: emit `verifier.runs.viewed` after first paint with `totalCount`, `passCount`, `failCount`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Run detail` drawer ships:

- Row click → drawer (right-anchored, 220ms slide).
- Drawer surfaces:
  - Per-item results (item id, score, pass/fail, model output, rubric note).
  - The benchmark version used (cross-link to `/benchmarks/{benchId}`).
  - The verifier who triggered the run.
  - Score distribution chart (histogram) for context.
- Emit `verifier.runs.row.opened` with `runId`.

## Filter flows (production)

- v0.4 has no filters.
- Production-recommended filter bar above the table:
  - Status segmented control (`All | pass | fail`).
  - Target picker (autocomplete on slug).
  - Bench picker (autocomplete on benchmark name).
  - Date range (`from` / `to`).

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `eval.run.completed`. New rows prepend with a subtle highlight; the dashboard's `Pass rate` StatCard re-derives.

## Score formatting

- Score and baseline cells use `Number.toFixed(2)` — always two decimals.
- The fallback for non-numeric values is to render the raw string (production should never hit this; the schema enforces numbers).
- Production-recommended: tint the score cell green when `score >= baseline + 0.05` (clearly above) and red when `score < baseline - 0.05` (clearly below). v0.4 keeps the cell uniform.

## Empty / error states

- **No runs yet**: render the table chrome with one body row text `No eval runs yet. Trigger one from /benchmarks.`
- **5xx**: render chrome + body row `Couldn't load runs.` and a top banner with `Retry`.
- **401/403**: redirect to verifier sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- `bench` cross-links to `/benchmarks` (by name; production should also surface `benchId`).
- `target` cross-links to `/queue` (filtered to that target) when the target is currently in review, or to public `/registry/{airId}` otherwise.
- A failed run on a safety benchmark (`mauritian-context-safety`, `sov-egress-redteam`) MAY trigger a `redteam.opened` event — the failed run cross-references the resulting red-team finding via shared `traceId`.

## Accessibility

- Score and baseline cells use mono fonts for digit alignment.
- StatusPill colour MUST be paired with the displayed status word (`pass` / `fail` shown via the `verified` / `failed` visuals).
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
