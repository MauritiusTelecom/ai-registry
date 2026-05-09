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

# Sovereign · Risk module — Data model

The Risk route binds to the same `risk` and `heatmap` data domains as the Sovereign dashboard. This document re-states the shapes for completeness; the canonical definitions live in `modules/sovereign/dashboard/data-model.md`.

## RiskWeek

Mirrors `SOV_RISK[i]` in `portals/sovereign-data.jsx`.

```ts
type RiskWeek = {
  day: string;        // human-readable label "Apr 09"
  score: number;      // composite index, 0..50 in v0.4 (lower is better)
};
type RiskTimeline = RiskWeek[];   // typically 5–13 entries
```

### v0.4 mock corpus

| day | score |
|---|---:|
| Apr 09 | 22 |
| Apr 16 | 19 |
| Apr 23 | 24 |
| Apr 30 | 31 |
| May 07 | 27 |

## SectorTierMatrix

```ts
type SectorTierMatrix = {
  sectors: string[];      // ['Edu','Fin','Health','Trade','Log','Agri']
  tiers:   string[];      // ['T-1','T-2','T-3','Restr.']
  data:    number[][];    // length === sectors.length, each row length === tiers.length
  max:     number;        // alpha gradient ceiling (4 in v0.4)
};
```

v0.4 cells reproduce the dashboard's `HeatmapCard` matrix verbatim.

## Authoritative response shape (production)

```ts
type SovRiskResponse = {
  risk: RiskTimeline;
  heatmap: SectorTierMatrix;
  methodologyVersion: string;     // e.g. 'risk-v0.4'
  generatedAt: string;
};
```

Production should also serve a per-period drill-down endpoint:

```ts
type RiskWeekDetail = RiskWeek & {
  contributors: Array<{
    factor: 'incident' | 'policy-violation' | 'flag' | 'review-backlog' | 'cross-border';
    weight: number;     // 0..1
    note?: string;
  }>;
};
```

## Constraints / invariants

- Risk score is unitless; the display contract assumes 0..50 in v0.4. Methodology changes MUST advance `methodologyVersion` and reset the y-axis ceiling if the score range changes.
- The heatmap matrix and the dashboard's heatmap MUST agree byte-for-byte at any given moment — both come from the same canonical source.
- `risk` array length is at least 5 weeks. Production should serve 13 weeks (one quarter) on this dedicated route to give context.

## Reference data on this page

- **Risk colour**: timeline uses `rgb(var(--primary-rgb))` for both the line stroke and the filled area (at opacity 0.15).
- **Heatmap alpha gradient**: `rgba(var(--primary-rgb), 0.15 + (v/max)*0.6)` for non-zero cells.
- **Right-slot big number**: `data[data.length-1].score` — most recent week's score, fontSize 22.
