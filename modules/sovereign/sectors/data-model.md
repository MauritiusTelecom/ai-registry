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

# Sovereign · Sectors module — Data model

## SectorCard

Mirrors `SOV_SECTORS[i]` in `portals/sovereign-data.jsx`.

```ts
type SectorCard = {
  name: 'Education' | 'Finance' | 'Health' | 'Trade' | 'Logistics' | 'Agriculture' | string;
  count: number;       // resources currently published in this sector
  tier: 'Tier-1' | 'Tier-2' | 'Tier-3' | 'Restricted';
  growth: string;      // signed-pct display string ("+12%", "0%", "-3%")
};
```

### Field semantics

- **`name`** — display label; matches the sector taxonomy maintained in `airegistry-specs/shared/`.
- **`count`** — current resource count published into this sector. Drives the big-number on the right of each card.
- **`tier`** — sovereignty tier of the sector's most representative resources (or `Restricted` if any sector resources are isolated under DPIA).
- **`growth`** — display string with explicit sign and percent unit. The prototype renders it green regardless of sign; production must colour by sign.

### v0.4 mock corpus (6 rows)

| name | count | tier | growth |
|---|---:|---|---|
| Education | 4 | Tier-1 | +12% |
| Finance | 3 | Tier-1 | +8% |
| Health | 1 | Restricted | 0% |
| Trade | 2 | Tier-1 | +4% |
| Logistics | 2 | Tier-1 | +22% |
| Agriculture | 2 | Tier-1 | +6% |

Total resources across sectors: 14 (matches the `Sovereign resources` StatCard on the dashboard plus reserved capacity).

## Authoritative response shape (production)

```ts
type SovSectorsResponse = {
  rows: SectorCard[];
  generatedAt: string;
};
```

Granular endpoint (planned): `/sovereign/sectors/{name}/series?window=…` for sparklines.

## Constraints / invariants

- Sector names in v0.4 match the heatmap rows on the dashboard's `HeatmapCard` (with abbreviations: `Edu`, `Fin`, `Health`, `Trade`, `Log`, `Agri`). Display labels here are the full names.
- A sector with `tier === 'Restricted'` has at least one resource currently isolated; the count includes isolated resources.
- `growth` is computed over the most recent 30 days vs the prior 30 days. Production must format with explicit sign and `%` unit.

## Reference data on this page

- **Tier tags**: `Tier-1`, `Tier-2`, `Tier-3`, `Restricted`. Rendered as `p-card-sub` text (NOT a chip on this page).
- **Growth colour**: hard-coded `#10b981` in v0.4; production should branch on sign:
  - `+` → `#10b981` (green)
  - `0%` → `var(--p-text-3)` (muted)
  - `-` → `#ef4444` (red)
