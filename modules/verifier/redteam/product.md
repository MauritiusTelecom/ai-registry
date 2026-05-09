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

# Verifier · Red-team module — Adversarial findings

## Purpose

Specify the **`/redteam` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every adversarial probe the verifier collegium has raised against registry resources — PII exfiltration attempts, sovereignty boundary leaks, hallucinated citations, and similar.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/redteam'` → `VER_PAGES.VerRedteam`) |
| Page component (`VerRedteam`) | `portals/verifier-pages.jsx` |
| Mock findings (`VER_REDTEAM`) | `portals/verifier-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Red-team"`
  - `breadcrumb=["Verifier", "Evaluation", "Red-team"]`
  - Active sidebar item: `Red-team` (`path: "/redteam"`, badge `2`).

## Route body — vertical layout (`VerRedteam`)

1. **PageHeader**
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Red-team findings`
- **Subtitle:** `Adversarial probes against registry resources.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `New finding`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 100 | `<span class="p-mono-val">{id}</span>` |
| `target` | `Target` | (auto) | `<span class="p-cell-strong">{target}</span>` |
| `vector` | `Vector` | (auto) | text in `var(--p-text-2)` |
| `severity` | `Severity` | 110 | `<span class="p-pill p-pill-{cls}"><span class="p-pill-dot"></span>{severity}</span>` where `cls = severity === 'high' ? 'isolated' : 'pending'` |
| `opened` | `Opened` | 110 | `<span class="p-mono-key">{opened}</span>` |
| `status` | `Status` | 110 | `<StatusPill status={cls}/>` where `cls = status === 'open' ? 'pending' : status === 'review' ? 'review' : 'verified'` |

Rows bind to `V.redteam`. The table is **non-interactive** (no `onRowClick` passed).

The severity pill mapping in v0.4 source has only TWO branches (`high` → `isolated`, anything else → `pending`); production should add `low` → `draft` for consistency with admin/flags + provider/incidents.

## Mock findings — `VER_REDTEAM`

Reproduce verbatim from `verifier-data.jsx`:

| id | target | vector | severity | status | opened |
|---|---|---|---|---|---|
| rt_44 | agent/citizen-helpdesk | PII exfiltration via prompt injection | high | open | 2026-05-04 |
| rt_43 | model/openai-gpt-6 | Sovereignty boundary leak | high | review | 2026-05-03 |
| rt_42 | agent/sugarcane-yield | Hallucinated citation | med | resolved | 2026-05-01 |

The badge `2` in the sidebar matches `count(status !== 'resolved')` (rt_44 + rt_43). The dashboard's `Open red-team` StatCard uses the same count.

## Status mapping (finding status → StatusPill)

| `status` | StatusPill visual |
|---|---|
| `open` | `pending` |
| `review` | `review` |
| `resolved` | `verified` |

Production MUST persist the canonical enum; the UI mapping is purely visual.

## Visual and motion

- The Vector column uses muted text (`var(--p-text-2)`) — the descriptions are operationally sensitive prose, not categorisations, and the muted tone signals their narrative role.
- Severity pill colour map: high → red, med → amber. Production must add a low → muted variant once it appears.
- StatusPill colour map per global token map (`pending`, `review`, `verified`).
- Table rows do not show hover affordance because click is not bound.

## Navigation behaviour

- `New finding` (header primary): no-op stub in v0.4. Production opens a modal capturing:
  - **Target** — resource picker (autocomplete on slug; the verifier's tenant catalogue + Tier-3 external models).
  - **Vector** — free-form prose describing the attack vector.
  - **Severity** — radio (high / med / low).
  - **Body** — multi-line text, ≥12 chars, with reproduction steps.
- On submit → POST `/verifier/redteam` with the form payload. Status defaults to `open`.
- Row click: not bound on this page in v0.4. Once a per-finding detail drawer ships, row click → drawer with the full reproduction, mitigation steps, and `Move to review / Resolve / Reopen` actions.

## Out of scope on this page

- Per-finding triage flow (escalate / resolve / reopen) — planned for production drawer.
- Cross-finding mitigation tracking — production may add a separate `/redteam/mitigations` route.
- Public disclosure timeline — high-severity findings have a 90-day public-disclosure clock; the timer lives outside this surface.

## Difference vs admin/flags + provider/incidents

| Concern | Admin /flags | Provider /incidents | Verifier /redteam |
|---|---|---|---|
| Header primary | Raise flag | Report incident | New finding |
| Source | DLP / safety / policy flags | Reliability / eval incidents | Adversarial probes |
| `vector` column | no | no | yes (free-form prose) |
| `kind` column | yes | yes | no (the vector IS the kind) |
| Severity pills | high/med/low | high/med/low | high (red) / else (amber) only in v0.4 |
| Status pill | open→pending, review→review, resolved→verified | open→pending, else→verified | open→pending, review→review, resolved→verified |
| Audit ledger action | flag.* | incident.* | redteam.* |
