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

# Sovereign · Incidents module — Data model

## SovIncident

Mirrors `SOV_INC[i]` in `portals/sovereign-data.jsx`. This is a sovereign-curated subset of the underlying provider / admin incident records.

```ts
type SovIncident = {
  id: string;          // "inc_<digits>"; opaque server-issued
  sector: 'education' | 'finance' | 'health' | 'trade' | 'logistics' | 'agriculture' | 'cross-cutting';
  target: string;      // resource slug under sovereign oversight
  kind: string;        // free-form category, sovereign-relevant
                       // ("PHI gateway isolated", "sovereignty re-classification", …)
  severity: 'high' | 'med' | 'low';
  opened: string;      // ISO date "YYYY-MM-DD"
};
```

### Field semantics

- **`sector`** — sector taxonomy used by the heatmap and `/sectors` page; `cross-cutting` is reserved for incidents that span multiple sectors.
- **`target`** — the resource id / slug. May reference a Tier-3 external model (e.g. `model/openai-gpt-6`).
- **`kind`** — sovereign-relevant categorisation. Different from provider-side incident kinds (`p99-spike`, `eval-regression`); sovereign incidents typically describe policy / safety / classification events.
- **`severity`** — same enum as admin-side flags and provider-side incidents. v0.4 mock rows are all `high`.
- **`opened`** — ISO date the sovereign team picked up oversight (NOT necessarily the date the incident was first raised at provider/admin level).

### v0.4 mock corpus (2 rows)

| id | sector | target | kind | severity | opened |
|---|---|---|---|---|---|
| inc_910 | health | mcp/health-records | PHI gateway isolated | high | 2026-04-29 |
| inc_909 | cross-cutting | model/openai-gpt-6 | sovereignty re-classification | high | 2026-05-01 |

These cross-reference admin's `/flags` (e.g. `flg_001` and `flg_002`) and the resource registry (`mcp/health-records`, `model/openai-gpt-6`).

## Authoritative response shape (production)

```ts
type SovIncidentsResponse = {
  rows: SovIncident[];
  total: number;
  openCount: number;        // count(status !== 'resolved') — drives sidebar badge
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

Production should also surface a `status` field (`open | review | resolved`) once incidents have a lifecycle on the sovereign surface; v0.4 implies all listed rows are currently under oversight.

## Constraints / invariants

- An incident on this page MUST also exist in admin's `/flags` (if flag-driven) or provider's `/incidents` (if reliability-driven). The sovereign view is curated, NOT primary.
- `sector === 'cross-cutting'` is reserved for incidents that touch more than one sector; the dashboard heatmap doesn't have a `cross-cutting` row, so these incidents don't increment heatmap counts.
- `severity === 'high'` rows MUST page on-call via the planned sovereign on-call rotation (separate from provider PagerDuty).
- Closing an incident on the sovereign side does NOT close it at the provider/admin level — sovereign oversight ends, but the underlying record continues until the originating party closes it.

## Reference data on this page

- **Sector taxonomy**: `education`, `finance`, `health`, `trade`, `logistics`, `agriculture`, `cross-cutting`.
- **Severity pills (production)**: `p-pill-isolated` (high), `p-pill-pending` (med), `p-pill-draft` (low). v0.4 hard-codes `isolated` because all mock rows are `high`.
- **Kind taxonomy (sovereign-side)**: examples include `PHI gateway isolated`, `sovereignty re-classification`. Production should converge on a closed taxonomy maintained in `airegistry-specs/governance/`.
