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

# Provider · Incidents module — Reliability & evaluation incidents

## Purpose

Specify the **`/incidents` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every reliability or evaluation incident raised against the active provider's resources — both auto-detected (latency spikes, eval regressions) and provider-reported.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/incidents'` → `PROV_PAGES.ProvIncidents`) |
| Page component (`ProvIncidents`) | `portals/provider-pages.jsx` |
| Mock incidents (`PROV_INCIDENTS`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Incidents"`
  - `breadcrumb=["Provider", "Observe", "Incidents"]`
  - Active sidebar item: `Incidents` (`path: "/incidents"`, badge `1` from sidebar definition).

## Route body — vertical layout (`ProvIncidents`)

1. **PageHeader**
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Incidents`
- **Subtitle:** `Reliability and evaluation incidents on your resources.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Report incident`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
| `resource` | `Resource` | (auto) | `<span class="p-cell-strong">{resource}</span>` |
| `kind` | `Kind` | (auto) | `<span class="p-tag">{kind}</span>` |
| `severity` | `Severity` | 110 | `<span class="p-pill p-pill-{cls}"><span class="p-pill-dot"></span>{severity}</span>` where `cls = severity === 'high' ? 'isolated' : severity === 'med' ? 'pending' : 'draft'` |
| `opened` | `Opened` | 160 | `<span class="p-mono-key">{opened}</span>` |
| `status` | `Status` | 110 | `<StatusPill status={r.status === 'open' ? 'pending' : 'verified'}/>` |

Rows bind to `P.incidents` (no filtering, no sorting in v0.4). The table is **non-interactive** (no `onRowClick` passed).

## Status mapping (incident status → StatusPill)

The intrinsic `status` field uses `open | investigating | resolved`; the StatusPill rendered uses two visuals:

| Incident `status` | StatusPill visual |
|---|---|
| `open` | `pending` |
| `investigating`, `resolved`, anything else | `verified` |

Production MUST persist the canonical enum; the UI mapping is purely visual. The fallback to `verified` for `investigating` is a v0.4 limitation; once the broader StatusPill catalogue includes a `review`-style intermediate, remap `investigating` to `review`.

## Mock incidents — `PROV_INCIDENTS`

Reproduce verbatim from `provider-data.jsx`:

| id | resource | kind | severity | opened | status |
|---|---|---|---|---|---|
| inc_44 | mcp/edu-curriculum | p99-spike | low | 2026-05-03 11:14 | resolved |
| inc_43 | agent/curriculum-tutor | eval-regression | med | 2026-05-06 09:02 | open |

The badge `1` in the sidebar reflects `count(status === 'open')`. Production must compute live from the open count.

## Visual and motion

- Severity pill colour mapping (per `portal-styles.css`):
  - `p-pill-isolated` (high) → red
  - `p-pill-pending` (med) → amber
  - `p-pill-draft` (low) → muted
- StatusPill colours per global token map.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- `Report incident` (header primary): no-op stub in prototype. Production opens a modal capturing:
  - **Resource** — picker over the provider's own `Resource` records.
  - **Kind** — combobox seeded with prior taxonomy values (`p99-spike`, `eval-regression`, `outage`, `security-event`); free-form fallback.
  - **Severity** — radio (high / med / low). Default `med`.
  - **Body** — multi-line text, ≥12 chars, describing the incident.
  - **Public** — toggle (default off). When on, the incident appears on the public profile and status page.
- On submit → POST `/provider/incidents`. Status defaults to `open`.
- Row click: not bound on this page; planned for production once a per-incident detail / timeline route ships.

## Out of scope on this page

- Per-incident detail / postmortem.
- Status page surfacing toggle (planned at `Settings → Notifications`).
- Cross-portal links to admin's flag system (admin-side `flags` cover policy violations; provider-side `incidents` cover reliability + eval).

## Differences vs admin/flags

For implementers familiar with the admin module:

| Concern | Admin /flags | Provider /incidents |
|---|---|---|
| Source of items | Admin-raised flags | Provider self-reports + auto-detected |
| Header primary | `Raise flag` | `Report incident` |
| Severity pills | identical (`high`/`med`/`low`) | identical |
| Status persisted enum | `open`/`review`/`resolved` | `open`/`investigating`/`resolved` |
| StatusPill mapping | open→pending, review→review, resolved→verified | open→pending, else→verified |
| `kind` vocabulary | governance / safety / policy | reliability / eval / safety |
| Audit ledger action | `flag.*` | `incident.*` |
