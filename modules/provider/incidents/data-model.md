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

# Provider · Incidents module — Data model

## Incident

Mirrors `PROV_INCIDENTS[i]` in `portals/provider-data.jsx`.

```ts
type Incident = {
  id: string;          // "inc_<digits>"; opaque server-issued
  resource: string;    // resource slug (e.g. "mcp/edu-curriculum")
  kind: string;        // free-form taxonomy: "p99-spike" | "eval-regression" | "outage" | "security-event" | …
  severity: 'high' | 'med' | 'low';
  opened: string;      // "YYYY-MM-DD HH:MM"; tenant-server local time
  status: 'open' | 'investigating' | 'resolved';
};
```

### Field semantics

- **`id`** — opaque incident id, monotonic per provider tenant.
- **`resource`** — slug of the affected resource. Must exist in `/provider/resources`.
- **`kind`** — free-form taxonomy. Known values surfaced in v0.4: `p99-spike`, `eval-regression`. Production should converge on a closed taxonomy maintained in `airegistry-specs/governance/`.
- **`severity`** — set at creation; reviewers can escalate but should not de-escalate without an audit reason.
- **`opened`** — date-time the incident entered the queue. Server formats to local time; the column is mono and 160px wide.
- **`status`** — three-state lifecycle:
  - `open` — newly raised, not yet investigated.
  - `investigating` — actively under analysis.
  - `resolved` — closed (root cause identified or false positive).

### v0.4 mock corpus (2 rows)

| id | resource | kind | severity | opened | status |
|---|---|---|---|---|---|
| inc_44 | mcp/edu-curriculum | p99-spike | low | 2026-05-03 11:14 | resolved |
| inc_43 | agent/curriculum-tutor | eval-regression | med | 2026-05-06 09:02 | open |

## Authoritative response shape (production)

```ts
type ProviderIncidentsResponse = {
  rows: Incident[];
  total: number;
  openCount: number;          // count(status !== 'resolved') — drives sidebar badge
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` is unique per provider tenant.
- Multiple incidents MAY exist against the same `resource`; they are independent records.
- A `severity === 'high'` incident MUST page on-call via the configured `Settings → Notifications → Incident channel` integration; the dispatch is async to incident creation.
- Closing an incident (status → `resolved`) MUST capture a `body` (≥12 chars) explaining the resolution and write `incident.resolve` to the audit ledger.
- Reopening a resolved incident is allowed; production MUST emit `incident.reopen` and reset `status` to `investigating` (NOT `open`).
- Marking an incident `public` requires the provider org's `owner` role (production); pubicness is an out-of-band toggle (not in this list).

## Reference data on this page

- **Severity pills:** `p-pill-isolated` (high), `p-pill-pending` (med), `p-pill-draft` (low). Identical to admin/flags.
- **StatusPill mapping (display-only):** `open` → `pending`, anything else → `verified`. Persisted value is the incident-native enum.
