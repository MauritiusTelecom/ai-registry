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

# Verifier · Queue module — Data model

## ReviewQueueRow

Same shape as `modules/verifier/dashboard/data-model.md`'s `ReviewQueueRow` (single source of truth for the queue row in `VER_QUEUE`).

```ts
type ReviewQueueRow = {
  id: string;          // "rev_<digits>"
  target: string;      // resource slug, optionally suffixed with version
  kind: 'mcp-server' | 'agent' | 'tool' | 'model';
  stage: 'sovereignty' | 'evaluation' | 'safety';
  priority: 'high' | 'med' | 'low';
  queued: string;      // ISO date "YYYY-MM-DD"
  age: string;         // server-formatted ("1d", "2d", "3d", "6d", …)
  provider: string;    // provider display name
};
```

The dashboard surfaces `slice(0, 4)`; this page surfaces the full list.

### v0.4 mock corpus (5 rows)

See `product.md` for the verbatim table. Counts:

- 5 rows total → drives the sidebar badge `5`.
- 2 by stage `sovereignty`, 2 by `evaluation`, 1 by `safety`.
- 2 priority `high`, 2 `med`, 1 `low`.
- 1 row exceeds the 4-day SLA (`rev_8818` at `6d`); 4 rows are within SLA.

## Filters (production)

```ts
type QueueFilters = {
  stage:    'all' | ReviewQueueRow['stage'];
  priority: 'all' | ReviewQueueRow['priority'];
  provider?: string;     // exact provider name match
  q?: string;            // free-text search on target / id / provider
};
```

Defaults at mount: `{ stage: 'all', priority: 'all' }`. v0.4 has no filters; production may add them.

## Decision actions (production)

When the row drawer ships, the verifier can decide each review with one of:

```ts
type ReviewDecision = {
  decision: 'approve' | 'reject' | 'withdraw';
  body:     string;       // ≥12 chars; signed comment recorded with the decision
};
```

Outcomes:

- `approve` → underlying resource transitions from `review` to `verified` (or `experimental` for first-time agent / model).
- `reject` → underlying resource returns to `draft` (or `experimental` if it was previously published).
- `withdraw` → the verifier closes the row without a decision; provider may resubmit.

A successful decision writes to the immutable audit ledger as `review.approve | review.reject | review.withdraw`.

## Authoritative response shape (production)

```ts
type VerifierQueueResponse = {
  rows: ReviewQueueRow[];
  total: number;
  counters: { sovereignty: number; evaluation: number; safety: number };
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

`counters` is reserved for future StatCard use on this page.

## Constraints / invariants

- The same `id` may appear once and only once across the queue. A submission already in `decided` no longer surfaces here.
- `target` matches the canonical resource slug; `provider` matches the canonical provider display name.
- `age` parses cleanly: regex `^\d+d$` for day-rounded ages, or `\d+w` / `\d+mo` for older items. Production must keep this so the SLA-colour rule (`parseInt(age) > 4`) continues to work.

## Reference data on this page

- **Stage tags:** `sovereignty`, `evaluation`, `safety`.
- **Priority pills:** high → `p-pill-isolated`, med → `p-pill-pending`, low → `p-pill-draft`.
- The `assigned` field that admin's `/reviews` surfaces is NOT on this page — verifier `/queue` is the verifier's own list (effectively `assigned === 'me'` server-side).
