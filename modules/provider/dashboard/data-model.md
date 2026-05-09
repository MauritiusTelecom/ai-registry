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

# Provider · Dashboard module — Data model

The dashboard is **read-only** and binds to four provider-scoped data domains held in the prototype as `window.PROV_DATA` (see `portals/provider-data.jsx`). Every field is scoped to the active provider tenant; production must derive `providerId` from the session.

## ProviderDashboardSummary (top StatCard grid)

The four cards on the dashboard derive their values from aggregate counts plus a hand-curated 7-day delta. In the prototype these are hard-coded; production should compute from the underlying domains.

| Field | Type | Source | Display |
|-------|------|--------|---------|
| `resourcesLive` | integer | `count(resources WHERE status IN ('verified','experimental'))` | `3` |
| `resourcesLiveDelta7d` | signed integer | new resources reaching live state in 7d | `+1` |
| `calls7d` | string | `format(sum(calls in last 7d))` (compact units, `21.5k`) | `21.5k` |
| `calls7dDeltaPct` | string | `±NN%` vs prior 7d | `+12%` |
| `uptime90d` | string | `format(uptime over 90d, %)` | `99.97%` |
| `uptime90dDelta` | string | abs delta vs prior 90d window | `0` |
| `openSubmissions` | integer | `count(subs WHERE status !== 'approved')` | `2` |
| `openSubmissionsDelta7d` | signed integer | new submissions in 7d | `+1` |

Tone mapping (product-defined):

- `resourcesLiveDelta7d` positive = `pos`.
- `calls7dDeltaPct` positive = `pos`.
- `uptime90dDelta` zero = `neu`; positive = `pos`; negative = `neg`.
- `openSubmissionsDelta7d` is **always** `neu` on this page (delta is informational; whether more submissions is good or bad depends on context).

## UsageSeries (chart card)

The chart binds to `PROV_DATA.usage` — a 7-element array, one element per weekday.

```ts
type UsageDay = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  mcp:   number;   // calls in this day to mcp-server resources
  tool:  number;   // calls in this day to tool resources
  agent: number;   // calls in this day to agent resources (typically 1-2 orders smaller)
};
type UsageSeries = UsageDay[];        // length 7
```

Display rules:

- Three bars per day, left-to-right: `mcp` → `tool` → `agent`.
- Bar colour mapping (do not change):
  - `mcp` → `rgb(var(--primary-rgb))` (square swatch in legend)
  - `tool` → `rgb(var(--secondary-rgb))`
  - `agent` → `rgb(var(--tertiary-rgb))`
- y-axis ceiling `maxV = 2500` (used by the SVG renderer for height calculation).
- The `agent` bar's height is multiplied by `6` so the small numbers remain visible. Production must preserve the multiplier so the visual mass of the agent series matches the prototype.

### v0.4 mock corpus (7 rows)

| day | mcp | tool | agent |
|-----|----:|-----:|------:|
| Mon | 1820 | 1290 | 42 |
| Tue | 2010 | 1330 | 51 |
| Wed | 1940 | 1470 | 68 |
| Thu | 2210 | 1390 | 80 |
| Fri | 2380 | 1520 | 79 |
| Sat | 1100 | 720 | 21 |
| Sun | 940 | 660 | 19 |

## OpenSubmissionsList (right card)

Source: `PROV_DATA.subs` filtered to `status !== 'approved'`. No `slice` is applied in the prototype — all matching rows are shown.

```ts
type Submission = {
  id: string;          // "s_<digits>"
  target: string;      // resource slug + optional version (e.g. "agent/curriculum-tutor v0.4.0")
  stage: 'sovereignty' | 'evaluation' | 'safety';
  submitted: string;   // "YYYY-MM-DD"
  status: 'pending' | 'review' | 'approved';
  age: string;         // display string ("4h", "1d", "closed", …)
};
```

Display rules (as on this page):

- Title row binds `target`.
- Meta row composes `${stage} · ${age}`.
- Right pill: `<StatusPill status={s.status}/>` — passes the raw status value through (NOT remapped, unlike admin's flags card).

The Submissions page itself (`/submissions`) DOES remap status; on the dashboard the raw enum is rendered.

## Reference data on this page

- **StatusPill states surfaced:** `pending`, `review`, `approved`. The latter does not appear on this card because the filter excludes it; the page below (`/submissions`) shows it via remapped visual `verified`.

## Authoritative response shape (production)

```ts
type ProviderDashboardResponse = {
  summary: ProviderDashboardSummary;
  usage: UsageSeries;
  openSubmissions: Submission[];   // status !== 'approved'
  generatedAt: string;             // ISO-8601 UTC
};
```

## Local state (none)

The dashboard component holds **no React state**. There are no filters, no toggles, no modal state on this route. All interactivity is delegation to other routes.
