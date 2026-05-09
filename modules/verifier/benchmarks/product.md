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

# Verifier · Benchmarks module — Evaluation suites

## Purpose

Specify the **`/benchmarks` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every evaluation suite the verifier collegium maintains — eval and safety benchmarks the registry uses to decide reviews.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/benchmarks'` → `VER_PAGES.VerBenchmarks`) |
| Page component (`VerBenchmarks`) | `portals/verifier-pages.jsx` |
| Mock benchmarks (`VER_BENCH`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Benchmarks"`
  - `breadcrumb=["Verifier", "Evaluation", "Benchmarks"]`
  - Active sidebar item: `Benchmarks` (`path: "/benchmarks"`).

## Route body — vertical layout (`VerBenchmarks`)

1. **PageHeader**
2. **Card grid** — `p-grid p-grid-2` of one card per benchmark

This page does NOT use a `DataTable`. It uses a 2-column responsive card grid, similar to provider/docs and sovereign/reports.

## Section copy and UI — PageHeader

- **Title:** `Benchmarks`
- **Subtitle:** `Evaluation suites maintained by the verifier collegium.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `New benchmark`

## Section copy and UI — Benchmark card

Each card is a `p-card` with three blocks:

1. **Card head** (`p-card-head`, flex row, space-between, baseline aligned):
   - **Left**: stacked title + sub
     - Title (`p-card-title`): `b.name`
     - Sub (`p-card-sub`): `${b.kind} · ${b.version}`
   - **Right**: `<span class="p-tag">{b.items} items</span>`
2. **Updated row** (`p-row` with `justifyContent: 'space-between', marginTop: 4`):
   - Left: `<span class="p-mono-key">updated</span>`
   - Right: `<span class="p-mono-val">{b.updated}</span>`
3. **Divider** (`p-divider`)
4. **Action row** (`p-row` with `gap: 8`):
   - `Btn variant="secondary" size="sm" icon="eye"`: `Inspect`
   - `Btn variant="ghost" size="sm" icon="zap"`: `Run`

## Mock benchmarks — `VER_BENCH`

Reproduce verbatim from `verifier-data.jsx`:

| id | name | version | items | kind | updated |
|---|---|---|---:|---|---|
| b_001 | mu-legal-truth | v1.4 | 1240 | evaluation | 2026-04-30 |
| b_002 | creole-translation-pairs | v2.0 | 5400 | evaluation | 2026-05-02 |
| b_003 | mauritian-context-safety | v0.9 | 480 | safety | 2026-04-22 |
| b_004 | sov-egress-redteam | v3.1 | 320 | safety | 2026-05-04 |

Two `evaluation` benchmarks and two `safety` benchmarks in v0.4. The `kind` taxonomy is `evaluation | safety`; production may add `regression`, `economic`, `bias`, etc.

## Visual and motion

- Card head font sizes: title is the standard `p-card-title`; sub composes `${kind} · ${version}` in `p-card-sub`. The right-side `${items} items` text is a `p-tag` chip.
- Updated row uses small mono key + value styling.
- Action buttons use `size="sm"` — smaller padding than default.
- Cards inherit standard `p-card` gradient border and hover lift treatment.

## Navigation behaviour

- `New benchmark` (header primary): no-op stub in v0.4. Production opens an authoring form (out of scope).
- `Inspect` (per card): no-op stub. Production navigates to `/benchmarks/{id}` with the suite's items rendered as a paginated list.
- `Run` (per card): no-op stub. Production opens a "Run benchmark" modal that captures `target` (resource picker) and submits → `POST /verifier/benchmarks/{id}/runs`. The new run lands on `/runs`.

## Out of scope on this page

- Benchmark authoring / editing UI — production-only.
- Per-item drill-down — lives on the planned detail route.
- Versioning history — each row surfaces only the active version; older versions accessible via the planned detail route.
- Cross-benchmark comparison — production may add a side-by-side view.
