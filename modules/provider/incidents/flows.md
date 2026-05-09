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

# Provider · Incidents module — Flows

## Routing

- Route lives at `/incidents` of the provider portal hash router.
- Activated via sidebar `Incidents` (anchor `href="#/incidents"`) or command palette `Report incident` action.
- Sidebar badge (`1` in v0.4 prototype) reflects `count(status === 'open')`. Production must compute live from `openCount`.
- Active match: exact `'/incidents'` OR `path.startsWith('/incidents/')`.

## Initial render

1. `App` resolves `path === '/incidents'` → renders `<ProvIncidents/>`.
2. `ProvIncidents` reads `P.incidents` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 2 mock rows in document order.
4. Production: emit `provider.incidents.viewed` after first paint.

## Header action

### Flow 1 — Report incident

- Click → no-op stub in prototype.
- Production: open a modal capturing:
  - **Resource** — autocomplete picker over `GET /provider/resources`. The picker MUST scope to the active provider — never show another provider's resources.
  - **Kind** — combobox seeded with prior taxonomy values plus free-form fallback.
  - **Severity** — radio (high / med / low). Default `med`.
  - **Body** — multi-line text, ≥12 chars.
  - **Public** — toggle (default off). Confirms publication on the public profile / status page.
- On submit → POST `/provider/incidents`. The new incident lands with `status='open'` and is appended to the table immediately (optimistic) plus reconciled on next refresh.
- Emit `provider.incidents.action.report_incident.clicked` on the button click and `provider.incidents.action.report_incident.submitted` on 201.

## Severity escalation side-effects

- `severity === 'high'` incidents MUST page on-call via the `Settings → Notifications → Incident channel` integration. The dispatch is asynchronous to incident creation; the UI does NOT block on acknowledgement.
- `severity === 'high'` incidents older than 24h MUST surface a banner on the dashboard (cross-link not enforced in v0.4 prototype).

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Incident detail / timeline` route ships:

- Row click → `navigate(/incidents/{id})`.
- Detail page surfaces:
  - The originating signal (auto-detection rule body, or human-reported description).
  - The affected resource snapshot (slug, version, last metrics).
  - Timeline of events (`opened`, `comment`, `investigating`, `resolved`, `reopened`).
  - Actions: `Investigate / Resolve / Reopen / Public toggle / Add comment`.

## Status transitions

- `open → investigating` — POST `/investigate`. Status flips and an `investigating` event lands on the timeline.
- `investigating → resolved` — POST `/resolve`. `body` ≥12 chars (postmortem summary).
- `resolved → investigating` — POST `/reopen`. `body` ≥12 chars.

The status transitions match the persisted enum (`open | investigating | resolved`); the table on `/incidents` only renders the binary StatusPill (`pending` for `open`, `verified` otherwise) — production should add a third `review` visual once available so the `investigating` state has a distinct pill.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to provider-scoped WebSocket events: `incident.opened`, `incident.investigating`, `incident.resolved`, `incident.reopened`. Sidebar badge stays in sync.
  - Auto-detected incidents (`p99-spike`, `eval-regression`) arrive over the same WebSocket; the SPA prepends with a subtle highlight animation.

## Empty / error states

- **No rows** → render the table chrome with one body row text `No incidents. Healthy week.`
- **5xx** → render chrome + body row `Couldn't load incidents.` and a top banner with `Retry`.
- **401/403** → redirect to provider sign-in / "Insufficient permissions" empty.

## Accessibility

- Severity pill colour MUST be paired with the severity word (already true in source).
- StatusPill colour MUST be paired with the displayed status word.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
