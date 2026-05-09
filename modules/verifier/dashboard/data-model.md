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

# Verifier · Dashboard module — Data model

The dashboard binds to four data domains held in the prototype as `window.VER_DATA` (see `portals/verifier-data.jsx`).

## VerDashboardSummary (top StatCard grid)

```ts
type VerDashboardSummary = {
  openReviews:         number;     // === V.queue.length (5 in v0.4)
  openReviewsDelta7d:  number;     // +2 in v0.4
  decided30d:          number;     // 42
  decided30dDelta:     number;     // +6
  passRate:            string;     // "74%"
  passRateDeltaPP:     string;     // "-3pp" (percentage-points unit, NOT %)
  openRedteam:         number;     // === count(redteam.status !== 'resolved') (2 in v0.4)
  openRedteamDelta:    string;     // "0"
};
```

Tone mapping (product-defined):

- `openReviewsDelta7d` positive = `neg` (more backlog).
- `decided30dDelta` positive = `pos`.
- `passRateDeltaPP` negative = `neg` (lower pass rate is worse).
- `openRedteamDelta` always rendered with `neu` tone in v0.4 because severity / impact varies.

## ReviewQueueRow (Top of queue card + `/queue` page)

Mirrors `VER_QUEUE[i]` in `verifier-data.jsx`.

```ts
type ReviewQueueRow = {
  id: string;          // "rev_<digits>"
  target: string;      // resource slug, optionally suffixed with version
  kind: 'mcp-server' | 'agent' | 'tool' | 'model';
  stage: 'sovereignty' | 'evaluation' | 'safety';
  priority: 'high' | 'med' | 'low';
  queued: string;      // ISO date "YYYY-MM-DD"
  age: string;         // "1d", "2d", "3d", … (server-formatted)
  provider: string;    // provider display name
};
```

### v0.4 mock corpus (5 rows)

| id | target | stage | priority | queued | age | provider |
|---|---|---|---|---|---|---|
| rev_8821 | model/legal-fr-mu | sovereignty | high | 2026-05-06 | 1d | JusticeMU |
| rev_8820 | agent/sugarcane-yield | evaluation | med | 2026-05-05 | 2d | AgriMU |
| rev_8819 | agent/citizen-helpdesk | safety | med | 2026-05-04 | 3d | pmo.gov.mu |
| rev_8818 | model/openai-gpt-6 | sovereignty | high | 2026-05-01 | 6d | openai.com |
| rev_8817 | mcp/customs-tariff v2 | evaluation | low | 2026-05-04 | 3d | MRA |

The dashboard's "Top of queue" card surfaces `slice(0, 4)`.

The `Age` cell colour-codes red when `age` ends with `d` AND `parseInt(age) > 4` — `rev_8818` (6d) breaches the SLA. v0.4 source uses `parseInt(age) > 4`, so 5d is NOT yet breached (the threshold is "more than 4 days").

## RedteamFinding (Active red-team card + `/redteam` page)

Mirrors `VER_REDTEAM[i]`.

```ts
type RedteamFinding = {
  id: string;          // "rt_<digits>"
  target: string;      // resource slug
  vector: string;      // free-form attack vector description
  severity: 'high' | 'med' | 'low';
  status: 'open' | 'review' | 'resolved';
  opened: string;      // ISO date
};
```

### v0.4 mock corpus (3 rows)

| id | target | vector | severity | status | opened |
|---|---|---|---|---|---|
| rt_44 | agent/citizen-helpdesk | PII exfiltration via prompt injection | high | open | 2026-05-04 |
| rt_43 | model/openai-gpt-6 | Sovereignty boundary leak | high | review | 2026-05-03 |
| rt_42 | agent/sugarcane-yield | Hallucinated citation | med | resolved | 2026-05-01 |

The dashboard surfaces only rows with `status !== 'resolved'` — 2 rows in v0.4.

## Authoritative response shape (production)

```ts
type VerDashboardResponse = {
  summary: VerDashboardSummary;
  queueTop: ReviewQueueRow[];     // first N (4 in v0.4)
  activeRedteam: RedteamFinding[]; // status !== 'resolved'
  generatedAt: string;
};
```

## Constraints / invariants

- `openReviews` MUST equal `count(queue)` at the time of fetch.
- `openRedteam` MUST equal `count(redteam.status !== 'resolved')`.
- The SLA threshold for the queue's age-colour change is **>4 days** (per the source `parseInt(r.age) > 4`). Production must keep this exact threshold OR document the change.
- `passRate` is computed over the most recent 30 days; production should also serve `passRateRaw` (unitless 0..1) alongside the display string.

## Reference data on this page

- **Stage tags:** `sovereignty`, `evaluation`, `safety`.
- **Priority pills:** high → `p-pill-isolated`, med → `p-pill-pending`, low → `p-pill-draft`.
- **Severity pills (red-team):** high → `p-pill-isolated`, anything else → `p-pill-pending`. v0.4 source has only two cases — production should add `p-pill-draft` for `low` once it appears.
