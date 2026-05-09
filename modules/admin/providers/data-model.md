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

# Admin · Providers module — Data model

## Provider

Mirrors `ADMIN_PROVIDERS[i]` in `portals/admin-data.jsx`.

```ts
type Provider = {
  id: string;          // "prv_<slug>"; opaque server-issued
  name: string;        // display name; case used as authored
  domain: string;      // canonical web domain ("edu.gov.mu", "anthropic.com")
  kind: 'sovereign' | 'regional' | 'private' | 'external';
  tier: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'Restricted';
  resources: number;   // count of resources currently published by this provider
  status: 'verified' | 'review' | 'isolated';   // lifecycle state of the provider entity itself
  verified: string;    // ISO date "YYYY-MM-DD" or "—" if never verified
  primary: string;     // primary contact display name; "—" if none
  risk: 'low' | 'med' | 'high';
};
```

### Field semantics

- **`kind`** — sovereign vs regional vs private vs external. Drives the StatCard counters.
- **`tier`** — sovereignty tier of the provider entity. Distinct from a resource's own `sov` tier; a Tier-1 provider can publish Tier-1, Tier-2, or Tier-3 resources, etc.
- **`resources`** — informational denormalisation; production may serve this from a join.
- **`status`** — provider-level state. `verified` providers may publish; `review` cannot publish but may exist; `isolated` cannot publish AND their existing resources are isolated by default.
- **`verified`** — date of last successful provider verification (proof-of-control).
- **`primary`** — primary human contact for verification, escalations, and renewals.

### v0.4 mock corpus

| id | name | domain | kind | tier | resources | status | verified | primary | risk |
|---|---|---|---|---|---:|---|---|---|---|
| prv_eduMu | eduMu | edu.gov.mu | sovereign | Tier-1 | 4 | verified | 2026-02-04 | Sanjeev Pillay | low |
| prv_finmu | finance.gov.mu | finance.gov.mu | sovereign | Tier-1 | 3 | verified | 2026-01-22 | Marie Laurent | low |
| prv_anth | anthropic.com | anthropic.com | external | Tier-3 | 2 | verified | 2026-04-22 | Aisha Chen | med |
| prv_oai | openai.com | openai.com | external | Tier-3 | 1 | review | — | — | high |
| prv_moh | MoH-Mauritius | health.gov.mu | sovereign | Restricted | 1 | isolated | 2025-11-08 | Dr. R. Beegun | high |
| prv_island | IslandLabs | islandlabs.mu | private | Tier-2 | 3 | verified | 2026-03-18 | Yannick Boullé | low |
| prv_port | PortLouisLogistics | plport.mu | private | Tier-1 | 2 | verified | 2026-02-28 | Anil Joghee | low |
| prv_mra | MRA | mra.mu | sovereign | Tier-1 | 2 | verified | 2026-01-15 | Devina Ramphul | low |
| prv_agri | AgriMU | agri.gov.mu | sovereign | Tier-1 | 2 | verified | 2026-04-04 | Pravesh Beedasee | low |
| prv_iocom | IndianOceanCom | iocomm.org | regional | Tier-2 | 1 | verified | 2026-02-19 | Yves Razafy | low |

## Filters (local React state)

```ts
type ProvidersFilters = {
  q: string;                      // case-insensitive name search; domain NOT searched
  kind: 'all' | Provider['kind'];
};
```

Defaults at mount: `{ q: '', kind: 'all' }`. There is **no `status` filter** on this page (unlike `/resources`).

## StatCardCounters (derived)

```ts
type ProvidersCounters = {
  sovereign: number;
  regional:  number;
  private:   number;
  external:  number;
};
```

These are computed from the unfiltered list (denominator stays constant while a user filters), so the cards do not jiggle as filters change.

## Authoritative response shape (production)

```ts
type AdminProvidersResponse = {
  rows: Provider[];
  total: number;
  counters: ProvidersCounters;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `(name, domain)` MUST be unique per tenant.
- `kind === 'external'` providers MUST have `tier === 'Tier-3'` (frontier vendors are by definition not sovereign).
- `kind === 'regional'` providers MUST have `tier ∈ {Tier-1, Tier-2}`.
- A provider with `status === 'isolated'` MUST have `resources === count(their resources WHERE status === 'isolated')` after the cascade — production must enforce the cascade in the same transaction as the isolation.
- `verified === '—'` MUST mean `status !== 'verified'`. The reverse is not implied (a previously verified provider that is now under review keeps the prior `verified` date).

## Reference data on this page

- **Provider kinds:** `sovereign`, `regional`, `private`, `external` — each maps to one of the four StatCards.
- **Tiers:** `Tier-1`, `Tier-2`, `Tier-3`, `Restricted` — rendered as `p-tag` chip.
- **Status pills:** `verified`, `review`, `isolated`.
