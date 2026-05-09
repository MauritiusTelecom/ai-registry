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

# Sovereign · Dashboard module — Data model

The dashboard binds to four data domains held in the prototype as `window.SOV_DATA` (see `portals/sovereign-data.jsx`). Production must derive `tenantId` from the session.

## SovDashboardSummary (top StatCard grid)

```ts
type SovDashboardSummary = {
  sovereignResources:        number;   // count(catalog WHERE tier === 'Tier-1')
  sovereignResourcesDelta7d: number;
  crossBorderCalls:          string;   // "94k" — compact display of Tier-3 calls in 7d
  crossBorderCallsDeltaPct:  string;   // "+18%"
  riskIndex:                 number;   // composite weekly index, last value (27)
  riskIndexDelta:            number;   // signed delta vs prior week (-4 means "improved")
  openIncidents:             number;   // count(incidents WHERE status !== 'closed')
  openIncidentsDelta7d:      number;
};
```

Tone mapping:
- Sovereign resources: positive growth = `pos`.
- Cross-border calls: `neu` always (informational; growth doesn't map to good/bad on its own).
- Risk index: NEGATIVE delta = `pos` (lower risk is better).
- Open incidents: positive delta = `neg`.

Display defaults rendered in the prototype:
| Field | Value |
|---|---|
| `sovereignResources` | `48` |
| `sovereignResourcesDelta7d` | `+5` |
| `crossBorderCalls` | `94k` |
| `crossBorderCallsDeltaPct` | `+18%` |
| `riskIndex` | `27` |
| `riskIndexDelta` | `-4` |
| `openIncidents` | `2` |
| `openIncidentsDelta7d` | `+1` |

## TopologyGraph (TopologyCard)

```ts
type TopologyNode = {
  id: string;                    // resource slug short-form (e.g. "curriculum-tutor")
  x: number;                     // SVG x in viewBox 720
  y: number;                     // SVG y in viewBox 320
  kind: 'agent' | 'mcp' | 'tool' | 'model-ext';
};

type TopologyEdge = [string, string];   // [src.id, dst.id]

type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};
```

The prototype hard-codes 11 nodes and 6 edges with explicit (x, y) coordinates. Production should compute layouts server-side or via a force-directed algorithm in the SPA; coordinates in the response payload are the canonical source.

Colour mapping (do not change):
- `agent` → `rgb(var(--primary-rgb))`
- `mcp` → `rgb(var(--secondary-rgb))`
- `tool` → `rgb(var(--tertiary-rgb))`
- `model-ext` → `#f59e0b` (amber)

## SectorTierMatrix (HeatmapCard)

```ts
type SectorTierMatrix = {
  sectors: string[];             // ['Edu','Fin','Health','Trade','Log','Agri']
  tiers:   string[];             // ['T-1','T-2','T-3','Restr.']
  data:    number[][];           // length === sectors.length, each row length === tiers.length
  max:     number;               // alpha gradient ceiling (4 in v0.4)
};
```

v0.4 mock matrix:

| | T-1 | T-2 | T-3 | Restr. |
|---|---|---|---|---|
| Edu | 4 | 1 | 0 | 0 |
| Fin | 3 | 0 | 0 | 0 |
| Health | 0 | 0 | 0 | 1 |
| Trade | 2 | 0 | 0 | 0 |
| Log | 2 | 1 | 0 | 0 |
| Agri | 2 | 0 | 0 | 0 |

## RiskTimeline (RiskTimelineCard)

Source: `SOV_DATA.risk` — array of weekly composite scores.

```ts
type RiskWeek = {
  day: string;                   // human-readable label "Apr 09"
  score: number;                 // composite index, lower is better
};
type RiskTimeline = RiskWeek[];  // typically length 5–13 (production)
```

v0.4 mock corpus:

| day | score |
|---|---|
| Apr 09 | 22 |
| Apr 16 | 19 |
| Apr 23 | 24 |
| Apr 30 | 31 |
| May 07 | 27 |

The card's right-slot big number is `data[data.length - 1].score`. y-axis ceiling `max = 50` is used for SVG height calculation (do not change without re-validating that all production scores fit).

## Authoritative response shape (production)

```ts
type SovDashboardResponse = {
  summary: SovDashboardSummary;
  topology: TopologyGraph;
  heatmap: SectorTierMatrix;
  risk: RiskTimeline;
  generatedAt: string;
};
```

## Constraints / invariants

- Cross-border calls (Tier-3) are aggregated across ALL sovereign-tenant resources; they are NOT scoped per provider.
- Risk index methodology is documented in `airegistry-specs/governance/`; the dashboard surfaces only the composite score.
- The TopologyGraph reflects the **last 30 days of inter-resource calls**; resources with zero traffic are not rendered as nodes.
- Heatmap counts use `tier` (sovereignty tier) as the column key. Resources with sov `'—'` (drafts) are excluded.

## Reference data on this page

- **Sovereignty tiers:** `Tier-1`, `Tier-2`, `Tier-3`, `Restricted` — heatmap renders abbreviated forms `T-1 / T-2 / T-3 / Restr.`.
- **Sectors:** `Edu`, `Fin`, `Health`, `Trade`, `Log`, `Agri` — heatmap labels match the `Sector` taxonomy maintained in `airegistry-specs/shared/`.
