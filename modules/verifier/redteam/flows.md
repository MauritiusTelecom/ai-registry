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

# Verifier · Red-team module — Flows

## Routing

- Route lives at `/redteam` of the verifier portal hash router.
- Activated via sidebar `Red-team` (anchor `href="#/redteam"`) or command palette.
- Sidebar badge (`2` in v0.4) reflects `count(status !== 'resolved')`.
- Active match: exact `'/redteam'` OR `path.startsWith('/redteam/')`.

## Initial render

1. App resolves `path === '/redteam'` → renders `<VerRedteam/>`.
2. VerRedteam reads `V.redteam` directly (no local state in prototype).
3. DataTable paints synchronously with all 3 mock rows in document order.
4. Production: emit `verifier.redteam.viewed` with `totalCount` and `openCount`.

## Header action

### Flow 1 — New finding

- Click → no-op stub in v0.4.
- Production: open a modal capturing:
  - **Target** — resource picker (autocomplete on slug).
  - **Vector** — free-form prose (e.g. "PII exfiltration via prompt injection").
  - **Severity** — radio (high / med / low; default `med`).
  - **Body** — multi-line text, ≥12 chars, with reproduction steps.
- On submit → POST `/verifier/redteam`. Status defaults to `open`. Row prepends to the table; sidebar badge increments.
- Emit `verifier.redteam.action.new_finding.clicked` and `verifier.redteam.finding.created`.

## Triage flows (production drawer)

The prototype DataTable does not bind `onRowClick`. Once a per-finding detail drawer ships:

### Flow 2 — Move to review

- From the drawer, `Move to review` → confirmation dialog requiring `body` ≥12 chars.
- POST `/verifier/redteam/{id}/review`. Status flips to `review`; StatusPill changes from `pending` to `review`.
- Emit `verifier.redteam.finding.reviewing`.

### Flow 3 — Resolve

- From the drawer, `Resolve` → confirmation requiring `body` (mitigation summary, ≥12 chars).
- POST `/verifier/redteam/{id}/resolve`. Status flips to `resolved`.
- Emit `verifier.redteam.finding.resolved`.
- Sidebar badge decrements; the dashboard's `Active red-team` card body re-renders without this row.

### Flow 4 — Reopen

- From the drawer (only available when `status === 'resolved'`), `Reopen` → confirmation requiring `body` (≥12 chars).
- POST `/verifier/redteam/{id}/reopen`. Status flips back to `open`.
- Emit `verifier.redteam.finding.reopened`.

## Severity escalation side-effects

- A `severity === 'high'` finding's creation MUST page on-call via the configured Slack/PagerDuty integration. Dispatch is async to creation.
- High-severity findings start a 90-day public-disclosure clock. The clock surfaces on the planned detail drawer; if not resolved within 90 days, the finding becomes publicly disclosable.

## Auto-refresh

- Prototype: none.
- Production-recommended:
  - Refetch on `visibilitychange`.
  - Subscribe to tenant-scoped WebSocket events: `redteam.opened`, `redteam.reviewing`, `redteam.resolved`, `redteam.reopened`.
  - The dashboard's Active red-team card and the sidebar badge stay in sync via the same events.

## Empty / error states

- **No findings**: render the table chrome with one body row text `No red-team findings. Healthy posture.`
- **5xx**: render chrome + body row `Couldn't load findings.` and a top banner with `Retry`.
- **401/403**: redirect to verifier sign-in / "Insufficient permissions" empty.

## Cross-portal cross-references

- A failed run on a safety benchmark on `/runs` MAY auto-create a finding here with shared `traceId`.
- A finding's `target` cross-references admin's `/resources`, public `/registry`, and provider's `/resources`.
- High-severity findings against external Tier-3 models cross-reference sovereign `/incidents` once elevated to sovereign oversight.

## Accessibility

- Severity pill colour MUST be paired with the severity word.
- StatusPill colour MUST be paired with the displayed status word.
- Vector prose may be long; production should add tooltip / drawer to surface the full text rather than truncating in the table.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until the per-finding drawer ships.
