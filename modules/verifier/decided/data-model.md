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

# Verifier · Decided module — Data model

## DecidedReview

Mirrors `VER_DECIDED[i]` in `portals/verifier-data.jsx`.

```ts
type DecidedReview = {
  id: string;          // "rev_<digits>"; same id space as the open queue
  target: string;      // resource slug
  decision: 'approved' | 'rejected' | 'withdrawn' | 'archived';
  closed: string;      // ISO date "YYYY-MM-DD" the decision closed the review
  verifier: string;    // verifier email who decided
};
```

### Field semantics

- **`id`** — the same opaque id used while the review was open in `/queue`. Once a decision lands, the row migrates from `/queue` to `/decided`.
- **`target`** — resource slug at the time of decision. If the resource was later renamed, the historical slug is preserved here.
- **`decision`** — full enum: `approved | rejected | withdrawn | archived`.
  - `approved` → resource transitioned to `verified` (or `experimental`).
  - `rejected` → resource returned to `draft`.
  - `withdrawn` → verifier closed without a decision; provider may resubmit.
  - `archived` → the resource was end-of-life'd as part of the decision (e.g. `mcp/elections-stats`).
- **`closed`** — date of decision. Immutable.
- **`verifier`** — email of the decider; surfaces in muted text on this page. Cross-link to admin's `/users` for full identity.

### v0.4 mock corpus (5 rows)

| id | target | decision | closed | verifier |
|---|---|---|---|---|
| rev_8810 | mcp/edu-curriculum | approved | 2026-05-04 | sanjay@review.mu |
| rev_8809 | tool/translate-mfe | approved | 2026-05-03 | d.ramphul@mra.mu |
| rev_8808 | mcp/elections-stats | archived | 2026-03-12 | sanjay@review.mu |
| rev_8807 | tool/ocr-creole | approved | 2026-05-01 | sanjay@review.mu |
| rev_8806 | agent/cargo-tracker | approved | 2026-04-29 | d.ramphul@mra.mu |

The dashboard's `Decided (30d)` StatCard counts these rows over the last 30 days (`42` displayed value covers the full corpus, not just the 5 mock entries — production must compute live).

## Authoritative response shape (production)

```ts
type VerifierDecidedResponse = {
  rows: DecidedReview[];
  total: number;
  counters: {
    approved:  number;
    rejected:  number;
    withdrawn: number;
    archived:  number;
  };
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- A row in `/decided` has a corresponding immutable audit ledger row written at decision time (`review.approve | review.reject | review.withdraw | review.archive`).
- `id` is unique across BOTH `/queue` and `/decided` — they're disjoint sets at any given moment.
- `closed` is immutable. Corrections to a decision require a NEW review (and a paired `review.amend` entry on the ledger); the original row stays as-is.
- `verifier` is the email at decision time; if the verifier later changes their email, the historical row keeps the prior value.

## Reference data on this page

- **StatusPill mapping (display-only):** `approved` → `verified`, `archived` → `archived`, anything else → `rejected`.
- **Decision enum**: `approved`, `rejected`, `withdrawn`, `archived`. v0.4 mock data only surfaces `approved` and `archived`; production will see all four.
