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

# Admin · Reviews module — Data model

## Review

Mirrors `ADMIN_REVIEWS[i]` in `portals/admin-data.jsx`.

```ts
type Review = {
  id: string;          // "rev_<digits>"; opaque server-issued
  target: string;      // resource slug under review (e.g. "model/legal-fr-mu")
  stage: 'sovereignty' | 'evaluation' | 'safety';
  priority: 'high' | 'med' | 'low';
  assigned: string;    // email of reviewer, OR the literal string "unassigned"
  queued: string;      // ISO date "YYYY-MM-DD" (date the review was added to the queue)
  age: string;         // display string ("1d", "2d", "6d", "3w" …) — server-formatted
};
```

### Field semantics

- **`stage`** — single-value workflow stage. The three stages run **in parallel** (a resource may pass through more than one); they do not form a strict pipeline.
- **`priority`** — set at queue time by the requester or system; reviewers can escalate but not de-escalate without an audit reason.
- **`assigned`** — `unassigned` is a sentinel literal, not an empty string or null. Production should keep the same sentinel for UI parity.
- **`queued`** — date the review entered the queue. The age column derives from `now - queued` server-side and is rounded to the largest natural unit (day, week, month).
- **`age`** — display-only string. Do not parse client-side; the server formats it. Allowed examples: `1d`, `13d`, `3w`, `1mo`.

### v0.4 mock corpus (4 rows)

| id | target | stage | priority | assigned | queued | age |
|---|---|---|---|---|---|---|
| rev_8821 | model/legal-fr-mu | sovereignty | high | sanjay@review.mu | 2026-05-06 | 1d |
| rev_8820 | agent/sugarcane-yield | evaluation | med | d.ramphul@mra.mu | 2026-05-05 | 2d |
| rev_8819 | agent/citizen-helpdesk | safety | med | sanjay@review.mu | 2026-05-04 | 3d |
| rev_8818 | model/openai-gpt-6 | sovereignty | high | unassigned | 2026-05-01 | 6d |

## StageCounters (derived)

```ts
type StageCounters = {
  sovereignty: number;
  evaluation:  number;
  safety:      number;
};
```

Computed from the **unfiltered** queue. The sidebar badge value (`14` in v0.4) is the sum of all three plus any backlog not currently surfaced; production should compute it server-side and return it in the response envelope.

## Authoritative response shape (production)

```ts
type AdminReviewsResponse = {
  rows: Review[];
  total: number;             // for sidebar badge parity
  counters: StageCounters;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- A `Review` is created per `(target, stage)` pair; the same target may appear multiple times across stages but never twice within the same stage simultaneously.
- A review whose `assigned` becomes a non-`unassigned` value MUST emit `review.assigned` to the audit ledger.
- `priority === 'high'` reviews older than 7d MUST surface on the dashboard's flag right-rail (cross-link not enforced in v0.4 prototype).
- Closing a review removes it from this list AND writes one of `review.approve` / `review.reject` / `review.withdraw` to the audit ledger.

## Reference data on this page

- **Stages:** `sovereignty`, `evaluation`, `safety` — surfaced as `p-tag` chip in the table.
- **Priority pills:** `p-pill-isolated` (high), `p-pill-pending` (med). `low` is not used in v0.4 mock data; if introduced, render `p-pill-draft`.
- **Assignee tone:** `--p-text-3` for `unassigned`, `--p-text-2` otherwise.
