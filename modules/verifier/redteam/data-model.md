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

# Verifier · Red-team module — Data model

## RedteamFinding

Same shape as `modules/verifier/dashboard/data-model.md`'s `RedteamFinding` (single source of truth for `VER_REDTEAM`).

```ts
type RedteamFinding = {
  id: string;          // "rt_<digits>"
  target: string;      // resource slug
  vector: string;      // free-form attack vector description
  severity: 'high' | 'med' | 'low';
  status: 'open' | 'review' | 'resolved';
  opened: string;      // ISO date "YYYY-MM-DD"
};
```

The dashboard surfaces only rows with `status !== 'resolved'`; this page surfaces ALL rows.

### v0.4 mock corpus (3 rows)

| id | target | vector | severity | status | opened |
|---|---|---|---|---|---|
| rt_44 | agent/citizen-helpdesk | PII exfiltration via prompt injection | high | open | 2026-05-04 |
| rt_43 | model/openai-gpt-6 | Sovereignty boundary leak | high | review | 2026-05-03 |
| rt_42 | agent/sugarcane-yield | Hallucinated citation | med | resolved | 2026-05-01 |

## RedteamFindingDetail (production-only)

```ts
type RedteamFindingDetail = RedteamFinding & {
  body:           string;     // ≥12 chars; reproduction steps + impact analysis
  attachedRunIds: string[];   // /runs that triggered or replicated this finding
  mitigationIds:  string[];   // future: cross-link to mitigation records
  disclosure: {
    public:       boolean;
    publicAt?:    string;     // ISO date when public disclosure is allowed
    embargoUntil?: string;
  };
  triageNotes:
    Array<{
      ts:    string;
      actor: string;
      note:  string;
    }>;
};
```

## Authoritative response shape (production)

```ts
type VerifierRedteamResponse = {
  rows: RedteamFinding[];
  total: number;
  openCount: number;        // count(status !== 'resolved') — drives sidebar badge
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per tenant.
- A `severity === 'high'` finding MUST page on-call via the configured Slack/PagerDuty integration. Dispatch is async to creation.
- Closing a finding (status → `resolved`) MUST capture a `body` (≥12 chars) describing the mitigation and write `redteam.resolve` to the audit ledger.
- Reopening a resolved finding sets status to `open` (NOT `review`) and writes `redteam.reopen`.
- `severity === 'high'` findings have a 90-day public-disclosure clock; the timer is recorded server-side and surfaced on the planned detail drawer.

## Reference data on this page

- **Severity pill mapping (v0.4 source):** high → `p-pill-isolated`, anything else → `p-pill-pending`. Production should add `low` → `p-pill-draft`.
- **StatusPill mapping (display-only):** `open` → `pending`, `review` → `review`, `resolved` → `verified`. Persisted value is the canonical enum.
- **Vector taxonomy (v0.4 examples):** "PII exfiltration via prompt injection", "Sovereignty boundary leak", "Hallucinated citation". Free-form in v0.4; production should converge on a closed taxonomy maintained in `airegistry-specs/governance/`.
