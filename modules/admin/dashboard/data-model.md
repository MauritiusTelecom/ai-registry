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

# Admin · Dashboard module — Data model

The dashboard is **read-only**. It binds to four data domains held in the prototype as `window.ADMIN_DATA` (see `portals/admin-data.jsx`). Production must surface the same logical fields with the same names so the UI continues to render verbatim.

## DashboardSummary (top StatCard grid)

The four cards on the dashboard derive their values from aggregate counts plus a hand-curated 7-day delta. In the prototype these are hard-coded; production should compute them from the underlying domains.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `resourcesTotal` | integer | `count(resources)` | Display value `412` in prototype |
| `resourcesDelta7d` | signed integer | `count(resources WHERE created >= now-7d)` | Display `+18` |
| `providersTotal` | integer | `count(providers)` | `64` |
| `providersDelta7d` | signed integer | new providers verified | `+2` |
| `pendingReviewsTotal` | integer | `count(reviews WHERE state IN ('queued','sovereignty','evaluation','safety'))` | `14` |
| `pendingReviewsDelta7d` | signed integer | week-over-week change | `+3` |
| `policyViolationsTotal` | integer | `count(flags WHERE kind='policy' AND status='open')` (or equivalent) | `2` |
| `policyViolationsDelta7d` | signed integer | week-over-week change | `-4` |

Each delta has an associated `tone` of `pos`, `neg`, or `neutral`. The mapping is **product-defined**, not derived from sign:

- Resources, Providers: positive growth = `pos`
- Pending reviews: increase = `neg` (more backlog)
- Policy violations: decrease = `pos` (fewer violations)

## SubmissionsSeries (chart card)

Three time series, each `length === 60`. The prototype generates these synthetically; production must source from the submissions table and bucket by day.

```ts
type SubmissionsSeries = {
  days: 60;
  series: {
    provider:  number[]; // length 60, ordered oldest → newest
    sovereign: number[]; // length 60
    external:  number[]; // length 60
  };
  yMax: 22; // axis ceiling used by the SVG renderer
};
```

Colour mapping (do not change):
- `provider`  → `var(--primary)` / `rgb(var(--primary-rgb))`
- `sovereign` → `var(--secondary)` / `rgb(var(--secondary-rgb))`
- `external`  → `var(--tertiary)` / `rgb(var(--tertiary-rgb))`

## OpenFlagsList (right card)

Source: `ADMIN_DATA.flags` filtered to `status !== 'resolved'`, then `slice(0, 4)`.

```ts
type Flag = {
  id: string;          // e.g. "flg_001"
  target: string;      // resource slug, e.g. "mcp/health-records"
  kind: string;        // free-form taxonomy: "data-leak-risk", "sovereignty", "hallucination-rate", "license", ...
  severity: 'high' | 'med' | 'low';
  raisedBy: string;    // email or "auto/<rule>"
  raised: string;      // ISO date "YYYY-MM-DD"
  status: 'open' | 'review' | 'resolved';
};
```

Display rules:
- Title row binds `target`.
- Meta row composes `${kind} · raised ${raised}`.
- Pill class derives from severity:
  - `high` → `p-pill p-pill-isolated`
  - `med` → `p-pill p-pill-pending`
  - `low` → `p-pill p-pill-draft`

## RecentActivityRows (bottom card)

Source: `ADMIN_DATA.audit.slice(0, 6)`.

```ts
type AuditRecord = {
  id: string;        // e.g. "a_4421"
  ts: string;        // "YYYY-MM-DD HH:MM" local-server time
  actor: string;     // email or "system"
  action: string;    // dotted token, e.g. "resource.verify"
  target: string;    // resource slug or other identifier
  result: 'ok' | 'fail';
  sig: string;       // truncated hash, format "<4hex>…<2hex>"
};
```

Display rules:
- `Result` column maps `ok` → StatusPill `verified`, otherwise StatusPill `failed`.
- `Time`, `Action`, `Target`, `Sig` use the mono cell variant.
- Rows are **not** clickable on this page (`onRowClick` is not bound).

## Reference data used by the page

Pulled from `portals/reference-data.jsx`:

- **Status pills** rendered on this page:
  - `verified` — green
  - `failed` — red
- **Severity pills** rendered on this page:
  - `isolated` (used for `high`) — red
  - `pending` (used for `med`) — amber
  - `draft` (used for `low`) — neutral

(Other status / kind / sovereignty values are catalogued in `airegistry-specs/shared/` and module-level `data-model.md` files for pages that surface them.)

## Authoritative source-of-truth shapes

Production should serialise the dashboard payload as a single response keyed:

```ts
type AdminDashboardResponse = {
  summary: DashboardSummary;
  submissionsSeries: SubmissionsSeries;
  openFlags: Flag[];        // up to 4 items, status !== 'resolved'
  recentActivity: AuditRecord[]; // exactly 6
  generatedAt: string;      // ISO-8601 UTC
};
```

## Local state (none)

The dashboard component holds **no React state**. There are no filters, no toggles, no modal state on this route. All interactivity is delegation to other routes (see `flows.md`).
