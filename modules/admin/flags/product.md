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

# Admin · Flags module — Flags & incidents

## Purpose

Specify the **`/flags` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every automated and manual flag raised against registry entries, with severity, kind, and lifecycle status.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/flags'` → `ADMIN_PAGES.AdminFlags`) |
| Page component (`AdminFlags`) | `portals/admin-pages.jsx` |
| Mock flags (`ADMIN_FLAGS`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Flags & incidents"`
  - `breadcrumb=["Admin", "Governance", "Flags"]`
  - Active sidebar item: `Flags & incidents` (`path: "/flags"`, badge `3` from sidebar definition).

## Route body — vertical layout (`AdminFlags`)

1. **PageHeader**
2. **DataTable** — full width

There are **no StatCards** and **no FilterBar** on this page in v0.4. The dashboard's right rail surfaces a 4-row preview of the same data; the full list lives here.

## Section copy and UI — PageHeader

- **Title:** `Flags & incidents`
- **Subtitle:** `Automated and manual flags raised against registry entries.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Raise flag`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `Flag` | 110 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `kind` | `Kind` | (auto) | `<span class="p-tag">{kind}</span>` |
| `severity` | `Severity` | 110 | `<span class="p-pill p-pill-{cls}"><span class="p-pill-dot"></span>{severity}</span>` where `cls = severity === 'high' ? 'isolated' : severity === 'med' ? 'pending' : 'draft'` |
| `raisedBy` | `Raised by` | (auto) | text in `var(--p-text-2)` |
| `raised` | `Raised` | 110 | `<span class="p-mono-key">{raised}</span>` |
| `status` | `Status` | 110 | `<StatusPill status={cls}/>` where `cls = status === 'open' ? 'pending' : status === 'review' ? 'review' : 'verified'` |

Rows bind to `A.flags` (no filtering, no sorting in v0.4). The table is **non-interactive** in the prototype (no `onRowClick` passed).

## Mock flags — `ADMIN_FLAGS`

Reproduce verbatim from `admin-data.jsx`:

| id | target | kind | severity | raisedBy | raised | status |
|---|---|---|---|---|---|---|
| flg_001 | mcp/health-records | data-leak-risk | high | auto/dlp | 2026-05-06 | open |
| flg_002 | model/openai-gpt-6 | sovereignty | med | sanjay@review.mu | 2026-05-04 | review |
| flg_003 | agent/citizen-helpdesk | hallucination-rate | med | auto/eval | 2026-05-02 | open |
| flg_004 | tool/ocr-creole | license | low | auto/license-scan | 2026-04-28 | resolved |

The badge `3` in the sidebar item is the count of `status !== 'resolved'` flags in v0.4 (matches: 3 of 4). Production must compute the badge from the live count.

## Status mapping (flag status → StatusPill)

The flag's intrinsic `status` field uses `open | review | resolved`, but the `StatusPill` rendered in the table uses different visual states. Mapping (one-way, display only):

| Flag `status` | StatusPill visual |
|---|---|
| `open` | `pending` |
| `review` | `review` |
| `resolved` | `verified` |

Production MUST persist the canonical `open / review / resolved` value; the UI mapping is purely visual.

## Visual and motion

- Pill colour mapping (per `portal-styles.css`):
  - `p-pill-isolated` (high severity) → red
  - `p-pill-pending` (med severity) → amber
  - `p-pill-draft` (low severity) → muted
- StatusPill colours per global token map (see `shared/common-types.yaml`).
- Table rows do not show hover affordance because click is not bound.

## Navigation behaviour

- `Raise flag` (header primary): no-op stub in prototype. Production opens a small modal that captures `target` (resource picker), `kind` (free-form taxonomy), `severity` (radio), `body` (≥12 chars). On submit → POST `/admin/flags`.
- Row click: not bound on this page; planned for production once a flag detail / triage route ships.

## Out of scope on this page

- Flag detail / triage UI (planned).
- Flag closure / resolution flow (currently driven from the resource drawer at `/resources` via `Re-verify` etc.).
- Notification fan-out (handled by `Slack — #air-ops` and `PagerDuty` integrations; see `Settings → Integrations`).
