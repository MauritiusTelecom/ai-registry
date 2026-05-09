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

# Verifier · Benchmarks module — Data model

## Benchmark

Mirrors `VER_BENCH[i]` in `portals/verifier-data.jsx`.

```ts
type Benchmark = {
  id: string;          // "b_<digits>"; opaque server-issued
  name: string;        // kebab-case slug-ish title (e.g. "mu-legal-truth")
  version: string;     // SemVer-like ("v1.4", "v2.0", "v0.9", "v3.1")
  items: number;       // count of items / questions in the suite
  kind: 'evaluation' | 'safety' | string;   // production may extend
  updated: string;     // ISO date "YYYY-MM-DD"
};
```

### Field semantics

- **`name`** — kebab-case identifier; production should treat as a URL-safe slug.
- **`version`** — bumps independently of registry-wide schema versions; major bumps mean breaking changes to the item set.
- **`items`** — count of unique items; production should expose the items list via `/benchmarks/{id}/items`.
- **`kind`** — coarse taxonomy:
  - `evaluation` — capability / accuracy benchmarks (e.g. `mu-legal-truth`, `creole-translation-pairs`).
  - `safety` — adversarial / safety benchmarks (e.g. `mauritian-context-safety`, `sov-egress-redteam`).
- **`updated`** — date of the last item-set change.

### v0.4 mock corpus (4 rows)

| id | name | version | items | kind | updated |
|---|---|---|---:|---|---|
| b_001 | mu-legal-truth | v1.4 | 1240 | evaluation | 2026-04-30 |
| b_002 | creole-translation-pairs | v2.0 | 5400 | evaluation | 2026-05-02 |
| b_003 | mauritian-context-safety | v0.9 | 480 | safety | 2026-04-22 |
| b_004 | sov-egress-redteam | v3.1 | 320 | safety | 2026-05-04 |

## BenchmarkItem (production-only)

```ts
type BenchmarkItem = {
  id: string;          // "i_<digits>"; opaque
  prompt: string;      // input
  expected?: string;   // ground-truth reference (eval kinds)
  rubric?: string;     // grading rubric (safety kinds)
  tags: string[];
};
```

## Authoritative response shape (production)

```ts
type VerifierBenchmarksResponse = {
  rows: Benchmark[];
  total: number;
  generatedAt: string;
};
```

## Constraints / invariants

- `name` MUST be unique across the verifier collegium.
- `version` MUST advance monotonically per `name`; downgrade is not allowed.
- `items` MUST equal the count of items currently associated with the active `version`.
- A benchmark with `kind === 'safety'` SHOULD have `rubric` populated for every item; an `evaluation` benchmark SHOULD have `expected` populated.

## Reference data on this page

- **Kind values:** `evaluation`, `safety`.
- **Version format:** `v<major>.<minor>` in v0.4 corpus; production may add `<patch>` segment.
- The `${items} items` text in the right slot of each card head is a `p-tag` chip.
