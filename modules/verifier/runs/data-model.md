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

# Verifier · Runs module — Data model

## EvalRun

Mirrors `VER_RUNS[i]` in `portals/verifier-data.jsx`.

```ts
type EvalRun = {
  id: string;          // "run_<digits>"; opaque server-issued
  target: string;      // resource slug evaluated
  bench: string;       // benchmark name (matches Benchmark.name on /benchmarks)
  score: number;       // 0..1, two-decimal display
  baseline: number;    // 0..1, two-decimal display
  status: 'pass' | 'fail';
  ran: string;         // "YYYY-MM-DD HH:MM" tenant-server local time
};
```

### Field semantics

- **`id`** — opaque run id; production may use ULIDs.
- **`target`** — resource slug evaluated; matches `Resource.slug` in admin/provider catalogues.
- **`bench`** — benchmark name (NOT id) to keep the row self-describing without a join. Production should ALSO surface a `benchId` for the cross-link.
- **`score`** — primary outcome metric in [0, 1]. Display via `toFixed(2)`.
- **`baseline`** — published baseline for this benchmark (typically the previous-version score or a reference baseline). Display via `toFixed(2)`.
- **`status`** — derived from `score >= baseline` server-side. Persisted as the canonical pass/fail enum.
- **`ran`** — local timestamp; production should also serve `ranAt` (ISO-8601 UTC) for cross-tenant analytics.

### v0.4 mock corpus (4 rows)

| id | target | bench | score | baseline | status | ran |
|---|---|---|---:|---:|---|---|
| run_4421 | agent/sugarcane-yield | mu-legal-truth | 0.74 | 0.71 | pass | 2026-05-06 14:21 |
| run_4420 | agent/citizen-helpdesk | mauritian-context-safety | 0.62 | 0.80 | fail | 2026-05-06 12:08 |
| run_4419 | model/legal-fr-mu | mu-legal-truth | 0.81 | 0.71 | pass | 2026-05-06 09:55 |
| run_4418 | model/openai-gpt-6 | sov-egress-redteam | 0.49 | 0.85 | fail | 2026-05-05 18:33 |

## RunDetail (production-only)

```ts
type RunDetail = EvalRun & {
  benchId:       string;       // cross-link to /benchmarks/{benchId}
  benchVersion:  string;       // version of the benchmark used
  itemResults:
    Array<{
      itemId:   string;
      score:    number;
      passed:   boolean;
      output:   string;
      rubricNote?: string;
    }>;
  triggeredBy:   string;       // verifier email who pressed Run
};
```

## Authoritative response shape (production)

```ts
type VerifierRunsResponse = {
  rows: EvalRun[];
  total: number;
  passRate30d: string;     // matches the dashboard's Pass rate StatCard
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `score` and `baseline` MUST be in `[0, 1]`. Display formats are always two decimals; production must NEVER strip trailing zeros (so 0.50 stays "0.50", not "0.5").
- `status === 'pass'` IFF `score >= baseline` at run time. Production must persist the boolean snapshot; if the baseline changes later, the historical row keeps its prior status.
- `ran` advances monotonically per `(target, bench)` for the same benchmark version. Re-running the same combination produces a new row.
- `bench` cross-links by name; production should also surface `benchVersion` so historical runs survive benchmark version bumps.

## Reference data on this page

- **Status enum:** `pass`, `fail`. Mapped to StatusPill `verified` / `failed`.
- **Score formatting:** `Number.prototype.toFixed(2)` — always two decimal places.
- **Pass rate (cross-page):** the dashboard's `Pass rate` StatCard derives from a 30-day window (`74%` in v0.4); this page surfaces individual runs.
