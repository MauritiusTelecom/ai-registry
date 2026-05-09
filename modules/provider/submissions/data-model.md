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

# Provider · Submissions module — Data model

## Submission

Mirrors `PROV_SUBS[i]` in `portals/provider-data.jsx`. Same shape used by the dashboard's `Open submissions` right card.

```ts
type Submission = {
  id: string;          // "s_<digits>"; opaque server-issued
  target: string;      // resource slug (optionally suffixed with version, e.g. "agent/curriculum-tutor v0.4.0")
  stage: 'sovereignty' | 'evaluation' | 'safety';
  submitted: string;   // ISO date "YYYY-MM-DD"
  status: 'pending' | 'review' | 'approved' | 'rejected' | 'withdrawn';
  age: string;         // display string ("4h", "1d", "closed", …) — server-formatted
};
```

### Field semantics

- **`id`** — opaque submission id, monotonic per provider tenant. Cross-references the `Review` row admins see at `/reviews` (under a different shape — see `modules/admin/reviews/data-model.md`).
- **`target`** — composite reference: resource slug, optionally appended with a SemVer prefixed by a single space (`mcp/edu-curriculum v3.2.0`). Production MAY parse the version from the suffix; the UI binds it as a single string.
- **`stage`** — same three stages as the admin review queue. A submission may map to multiple stages over its lifetime; this field is the **current** stage.
- **`submitted`** — date the submission entered the queue.
- **`status`** — full lifecycle enum:
  - `pending` — queued, not yet picked up by a reviewer.
  - `review` — actively under review.
  - `approved` — decision was approve; resource transitions to `verified` or `experimental`.
  - `rejected` — decision was reject; resource returns to `draft` (or `experimental` if it was already published in a prior version).
  - `withdrawn` — provider withdrew before a decision.
- **`age`** — display string. The literal `closed` is a sentinel for resolved submissions (approved / rejected / withdrawn).

### v0.4 mock corpus (3 rows)

| id | target | stage | submitted | status | age |
|---|---|---|---|---|---|
| s_001 | tool/lesson-search | sovereignty | 2026-05-07 | pending | 4h |
| s_002 | agent/curriculum-tutor v0.4.0 | safety | 2026-05-06 | review | 1d |
| s_003 | mcp/edu-curriculum v3.2.0 | evaluation | 2026-05-02 | approved | closed |

## Authoritative response shape (production)

```ts
type ProviderSubmissionsResponse = {
  rows: Submission[];
  total: number;
  counters: {
    pending:    number;
    review:     number;
    approved:   number;
    rejected:   number;
    withdrawn:  number;
  };
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

Counters are reserved for future StatCard use.

## Constraints / invariants

- A `target` slug may have multiple submissions over time (one per published version + interim withdrawals). The list orders by `submitted` desc.
- A submission whose `status` becomes terminal (`approved` / `rejected` / `withdrawn`) MUST set `age` to `closed`.
- Concurrent submissions for the same `(target, version)` are rejected at the publish step; only one open submission per resource version may exist.
- `withdrawn` is provider-initiated only; reviewers cannot mark a submission as `withdrawn`.

## Reference data on this page

- **StatusPill mapping (display-only):** `approved → verified`, `review → review`, `pending → pending`, `rejected / withdrawn → pending` (v0.4 fallback). Production should add a `failed` / `archived` visual for the latter two.
- **Stage tags:** `sovereignty`, `evaluation`, `safety`. Identical to admin-side reviews.
- **`age` sentinel:** the literal `closed` denotes terminal submissions.
