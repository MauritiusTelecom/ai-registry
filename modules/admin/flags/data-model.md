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

# Admin · Flags module — Data model

## Flag

Mirrors `ADMIN_FLAGS[i]` in `portals/admin-data.jsx`. Same shape used by the dashboard right rail.

```ts
type Flag = {
  id: string;          // "flg_<digits>"; opaque server-issued
  target: string;      // resource slug (e.g. "mcp/health-records")
  kind: string;        // free-form taxonomy: "data-leak-risk" | "sovereignty" | "hallucination-rate" | "license" | …
  severity: 'high' | 'med' | 'low';
  raisedBy: string;    // email of the human, OR "auto/<rule>" for system-raised flags
  raised: string;      // ISO date "YYYY-MM-DD"
  status: 'open' | 'review' | 'resolved';
};
```

### Field semantics

- **`kind`** — free-form, but production should converge on a closed taxonomy maintained in `airegistry-specs/governance/`. Known values surface in v0.4: `data-leak-risk`, `sovereignty`, `hallucination-rate`, `license`.
- **`severity`** — set at flag creation; reviewers can escalate but should not de-escalate without an audit reason.
- **`raisedBy`** — `auto/*` prefix denotes system-raised flags; the suffix names the producing rule (e.g. `auto/dlp`, `auto/eval`, `auto/license-scan`).
- **`raised`** — date the flag entered the queue.
- **`status`** — lifecycle state. `open` → triage pending; `review` → being reviewed (typically tied to a `Review` row in `/reviews`); `resolved` → closed (with or without action).

### v0.4 mock corpus (4 rows)

| id | target | kind | severity | raisedBy | raised | status |
|---|---|---|---|---|---|---|
| flg_001 | mcp/health-records | data-leak-risk | high | auto/dlp | 2026-05-06 | open |
| flg_002 | model/openai-gpt-6 | sovereignty | med | sanjay@review.mu | 2026-05-04 | review |
| flg_003 | agent/citizen-helpdesk | hallucination-rate | med | auto/eval | 2026-05-02 | open |
| flg_004 | tool/ocr-creole | license | low | auto/license-scan | 2026-04-28 | resolved |

## Authoritative response shape (production)

```ts
type AdminFlagsResponse = {
  rows: Flag[];
  total: number;             // unfiltered total
  openCount: number;         // count(status !== 'resolved')  — drives sidebar badge
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per tenant.
- Multiple flags MAY exist against the same `target`; they are independent records.
- A flag with `severity === 'high'` MUST page on-call via the configured `PagerDuty` integration; the dispatch is async to flag creation.
- Closing a flag (status → `resolved`) MUST capture a `body` (≥12 chars) explaining the resolution and write `flag.resolve` to the audit ledger.
- Reopening a resolved flag is allowed; production MUST emit `flag.reopen` and reset `status` to `open` (NOT `review`).

## Reference data on this page

- **Severity pills:** `p-pill-isolated` (high), `p-pill-pending` (med), `p-pill-draft` (low). Per `reference-data.jsx`.
- **StatusPill mapping (display-only):** `open` → `pending`, `review` → `review`, `resolved` → `verified`. The persisted value is the flag-native enum.
