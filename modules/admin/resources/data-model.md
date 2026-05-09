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

# Admin · Resources module — Data model

## Resource

Canonical record bound by table rows and the drawer. Mirrors `ADMIN_RESOURCES[i]` in `portals/admin-data.jsx`.

```ts
type Resource = {
  id: string;          // "res_001"; opaque, server-issued, immutable
  slug: string;        // "mcp/edu-curriculum"; the user-visible AIR-ID-like path
  kind: 'mcp-server' | 'agent' | 'model' | 'tool';
  provider: string;    // display name, may match a Provider.name
  status: 'verified' | 'review' | 'experimental' | 'isolated' | 'archived';
  sov: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'Restricted';
  updated: string;     // "YYYY-MM-DD"
  region: string;      // "MU" | "MU/FR" | "MU/REGIONAL" | "GLOBAL" | … (free-form)
  risk: 'low' | 'med' | 'high';
  usage: string;       // "12.4k" | "94.0k" | "—"  (display string, prototype only)
  desc: string;        // one-line description
};
```

### Field semantics

- **`id`** — opaque primary key (`res_<digits>`). Never displayed in tables; surfaced only in drawer provenance and audit log entries.
- **`slug`** — kind/path-style identifier; the prototype uses `kind/short-name`. Production resolves `slug` ↔ `id` via the catalogue API.
- **`status`** — single-value workflow state. Allowed transitions are documented in `airegistry-specs/governance/` (out-of-scope for this page).
- **`sov`** — sovereignty tier. `Tier-1` is locally hosted under sovereign identity; `Tier-3` is external/frontier; `Restricted` blocks general access pending DPIA. Spec lives in `shared/`.
- **`region`** — free-form composite of country / regional / global codes used for display only.
- **`risk`** — risk classification produced by automated DLP / safety scans plus manual override. Display order high > med > low.
- **`usage`** — last-30-day discovery / call count, formatted as a short string. `'—'` denotes "not applicable" (e.g. archived or pending review).

### v0.4 mock corpus

The prototype ships 15 resources covering all four kinds and all five statuses. Production must NOT preload these rows; this list is reference only.

| id | slug | kind | provider | status | sov | region | risk | usage | updated |
|----|------|------|----------|--------|-----|--------|------|-------|---------|
| res_001 | mcp/edu-curriculum | mcp-server | eduMu | verified | Tier-1 | MU | low | 12.4k | 2026-05-04 |
| res_002 | agent/cargo-tracker | agent | PortLouisLogistics | verified | Tier-1 | MU | low | 4.2k | 2026-05-03 |
| res_003 | model/legal-fr-mu | model | JusticeMU | review | Tier-2 | MU/FR | med | — | 2026-05-06 |
| res_004 | mcp/health-records | mcp-server | MoH-Mauritius | isolated | Restricted | MU | high | — | 2026-04-29 |
| res_005 | agent/treasury-bot | agent | finance.gov.mu | verified | Tier-1 | MU | low | 880 | 2026-05-05 |
| res_006 | tool/ocr-creole | tool | IslandLabs | experimental | Tier-2 | MU | low | 2.1k | 2026-05-01 |
| res_007 | model/anthropic-sonnet-7 | model | anthropic.com | verified | Tier-3 | GLOBAL | med | 94.0k | 2026-04-22 |
| res_008 | mcp/maritime-zones | mcp-server | IndianOceanCom | verified | Tier-2 | MU/REGIONAL | low | 630 | 2026-05-02 |
| res_009 | agent/sugarcane-yield | agent | AgriMU | review | Tier-1 | MU | med | — | 2026-05-06 |
| res_010 | tool/translate-mfe | tool | eduMu | verified | Tier-1 | MU | low | 8.8k | 2026-05-04 |
| res_011 | mcp/customs-tariff | mcp-server | MRA | verified | Tier-1 | MU | low | 3.4k | 2026-04-30 |
| res_012 | agent/citizen-helpdesk | agent | pmo.gov.mu | experimental | Tier-1 | MU | med | 410 | 2026-05-06 |
| res_013 | model/openai-gpt-6 | model | openai.com | review | Tier-3 | GLOBAL | high | — | 2026-05-01 |
| res_014 | tool/satimg-classify | tool | MOI-Space | verified | Tier-2 | MU | low | 1.6k | 2026-04-27 |
| res_015 | mcp/elections-stats | mcp-server | ElectoralComm | archived | Tier-1 | MU | low | — | 2026-03-12 |

## Filters (local React state)

```ts
type ResourcesFilters = {
  q: string;                     // search query (case-sensitive on slug, case-insensitive on provider)
  kind: 'all' | Resource['kind'];
  status: 'all' | Resource['status'];
};
```

Defaults at mount: `{ q: '', kind: 'all', status: 'all' }`.
Filter result count is `filtered.length` and is rendered inline in the FilterBar right slot.

## Drawer state

```ts
type ResourcesPageState = {
  filters: ResourcesFilters;
  selectedRow: Resource | null;  // null = drawer closed
};
```

Drawer opens by setting `selectedRow` to the clicked row. Closing sets it back to `null`.

## Authoritative response shape (production)

```ts
type AdminResourcesResponse = {
  rows: Resource[];
  total: number;             // pre-filter count, used by FilterBar counter denominator
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;       // ISO-8601 UTC
};
```

Filtering MAY be done server-side for large catalogues; if so, the response payload still surfaces `total` so the UI counter (`${filtered.length} of ${total}`) renders correctly.

## Reference data this page surfaces

Pulled from `portals/reference-data.jsx`:

- **Status pills** rendered: `verified`, `review`, `experimental`, `isolated`, `archived`. Each maps to a colour and label. Spec lives in `shared/common-types.yaml`.
- **Kinds**: `mcp-server`, `agent`, `model`, `tool` (plain string in `p-cell-meta`).
- **Sovereignty tiers**: `Tier-1`, `Tier-2`, `Tier-3`, `Restricted`. Rendered as `p-tag` chip in the table and drawer.

## Constraints / invariants

- `slug` MUST be unique per tenant.
- `(kind, slug)` MUST be consistent: a `mcp/*` slug MUST have `kind === 'mcp-server'`, an `agent/*` slug MUST have `kind === 'agent'`, etc. The prototype enforces this by convention; production must validate at ingest time.
- `status === 'isolated'` implies the resource is non-resolvable for non-admin actors but still appears in this admin table.
- `usage === '—'` is shown for any row whose status is `review`, `isolated`, or `archived` AND whose 30-day usage is zero or suppressed.
