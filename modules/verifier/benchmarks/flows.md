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

# Verifier · Benchmarks module — Flows

## Routing

- Route lives at `/benchmarks` of the verifier portal hash router.
- Activated via sidebar `Benchmarks` (anchor `href="#/benchmarks"`) or command palette.
- Active match: exact `'/benchmarks'` OR `path.startsWith('/benchmarks/')`.

## Initial render

1. App resolves `path === '/benchmarks'` → renders `<VerBenchmarks/>`.
2. VerBenchmarks reads `V.bench` directly (no local state in prototype).
3. Card grid (`p-grid p-grid-2`) paints synchronously with all 4 mock cards.
4. Production: emit `verifier.benchmarks.viewed` after first paint.

## Header action

### Flow 1 — New benchmark

- Click → no-op stub in v0.4.
- Production: open an authoring modal capturing `name` (kebab-case), `kind` (radio: evaluation / safety), `version` (free-form). On submit → POST `/verifier/benchmarks`.
- Emit `verifier.benchmarks.action.new_benchmark.clicked`.

## Card action flows

### Flow 2 — Inspect

- Click → no-op stub in v0.4.
- Production: navigate to `/benchmarks/{id}` (drawer or full-page) which fetches `GET /verifier/benchmarks/{id}/items` and renders the items list paginated.
- Emit `verifier.benchmarks.card.inspect.clicked` with `benchmarkId`.

### Flow 3 — Run

- Click → no-op stub in v0.4.
- Production: open a small modal capturing:
  - **Target** — resource picker (autocomplete on slug); the verifier's tenant catalogue + Tier-3 external models.
- On submit → POST `/verifier/benchmarks/{id}/runs` with `{target}`. Server returns `202` with `runId`.
- Production navigates to `/runs?id={runId}` so the verifier sees the result on the eval-runs page.
- Emit `verifier.benchmarks.card.run.clicked` on click and `verifier.benchmarks.run.started` on 202.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`. Benchmarks change rarely.
  - Subscribe to tenant-scoped WebSocket events: `benchmark.published` (a new version of an existing benchmark) — the corresponding card head's sub line updates with the new `${kind} · ${version}`.

## Empty / error states

- **No benchmarks** (a fresh collegium): render the page with a single full-width card `No benchmarks yet. Author the first.`
- **5xx**: render PageHeader + a single full-width error card `Couldn't load benchmarks.` with `Retry` button.
- **401/403**: redirect to verifier sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- Each benchmark id MAY appear as the `bench` field on `/runs` rows; production should support cross-link.
- Provider's `/publish` step 3 (Verification) cross-references safety benchmarks; the registry's review board may require a passing run on a specific safety benchmark before approving a Tier-3 model.

## Accessibility

- Card head right-side `${items} items` chip should expose `aria-label="${items} items in this benchmark"` so screen readers don't say "1240 items items".
- Action buttons use `size="sm"` — ensure tap target is ≥40×40 dp on touch devices.
- The decorative gradient border on `p-card` is purely visual; no aria changes needed.
