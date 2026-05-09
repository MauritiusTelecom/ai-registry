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

# Sovereign · Catalog module — Data model

## SovCatalogEntry

Mirrors `SOV_CATALOG[i]` in `portals/sovereign-data.jsx`. This is a sovereign-scoped projection of the canonical `Resource` (defined in `modules/admin/resources/data-model.md`); it adds `sectors` and trims provider-specific fields.

```ts
type SovCatalogEntry = {
  id: string;          // "res_<digits>" — same id space as admin's Resource
  slug: string;        // identical to canonical Resource.slug
  kind: 'mcp-server' | 'agent' | 'tool' | 'model';
  tier: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'Restricted';
  region: string;      // free-form code ("MU", "GLOBAL")
  usage: string;       // 30d display string ("12.4k", "—")
  risk: 'low' | 'med' | 'high';
  sectors: string;     // single sector tag in v0.4 ("education", "cross-cutting", …)
};
```

### Field semantics

- **`sectors`** — single string in v0.4. Production may evolve to a comma-separated list or array; the UI binds it as text and renders it verbatim.
- **`tier`** — same enum as canonical Resource.sov; the catalog uses `tier` as the field name on this page (different from admin's `sov`).
- **`risk`** — admin's risk classification, surfaced uppercase in the table cell with colour coding (high red, med amber, low green).
- **`usage`** — last-30-day call display string. The literal `'—'` denotes pre-launch / isolated resources with no traffic.

### v0.4 mock corpus (6 rows)

| id | slug | kind | tier | region | sectors | usage | risk |
|---|---|---|---|---|---|---|---|
| res_001 | mcp/edu-curriculum | mcp-server | Tier-1 | MU | education | 12.4k | low |
| res_002 | agent/cargo-tracker | agent | Tier-1 | MU | logistics | 4.2k | low |
| res_005 | agent/treasury-bot | agent | Tier-1 | MU | finance | 880 | low |
| res_007 | model/anthropic-sonnet-7 | model | Tier-3 | GLOBAL | cross-cutting | 94.0k | med |
| res_011 | mcp/customs-tariff | mcp-server | Tier-1 | MU | trade | 3.4k | low |
| res_013 | model/openai-gpt-6 | model | Tier-3 | GLOBAL | cross-cutting | — | high |

Note: this is a **subset** of admin's resource catalogue — only entries relevant to the active sovereign tenant appear here.

## Authoritative response shape (production)

```ts
type SovCatalogResponse = {
  rows: SovCatalogEntry[];
  total: number;
  page?: { cursor?: string; size: number; hasMore: boolean };
  generatedAt: string;
};
```

## Constraints / invariants

- `id` and `slug` correspond to the same canonical records as admin's `/resources` and provider's `/resources`.
- The `sectors` taxonomy is closed at the registry level — production rejects unknown sector values at ingest time.
- Drafts (`status === 'draft'` in admin) are NOT surfaced here; the sovereign view shows only published or in-review resources.
- Cross-sector resources use the literal `cross-cutting`.

## Reference data on this page

- **Risk colour map:** high `#ef4444`, med `#f59e0b`, low `#10b981`.
- **Tier tags:** `Tier-1`, `Tier-2`, `Tier-3`, `Restricted`.
- **Sector taxonomy (v0.4):** `education`, `finance`, `health`, `trade`, `logistics`, `agriculture`, `cross-cutting`.
