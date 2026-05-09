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

# Admin · Flags module — Flows

## Routing

- Route lives at `/flags` of the admin portal hash router.
- Activated when sidebar item `Flags & incidents` is clicked (anchor `href="#/flags"`).
- Also reachable from the dashboard's `Open flags` card right link `See all`.
- Sidebar badge (`3` in v0.4 prototype) reflects `openCount = count(status !== 'resolved')`. Production must compute from `openCount` returned by `GET /admin/flags`.
- Active match: exact `'/flags'` OR `path.startsWith('/flags/')`.

## Initial render

1. `AdminApp` resolves `path === '/flags'` → renders `<AdminFlags/>`.
2. `AdminFlags` reads `A.flags` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 4 mock rows in document order.
4. Production: emit `admin.flags.viewed` after first paint.

## Header action

### Flow 1 — Raise flag

- Click → no-op stub in prototype.
- Production: open a small modal capturing:
  - **Target** — resource picker (autocomplete on slug; binds to existing `Resource.id`).
  - **Kind** — combobox seeded with prior taxonomy values (`data-leak-risk`, `sovereignty`, `hallucination-rate`, `license`); free-form fallback.
  - **Severity** — radio (high / med / low). Default `med`.
  - **Body** — multi-line text, minimum 12 characters.
- On submit → POST `/admin/flags`. New flag lands with `status='open'`, `raisedBy = actor.email`.
- On success: close modal, prepend the new row to the table, increment sidebar badge, emit `admin.flags.action.raise_flag.submitted`.
- On 400 validation error: keep modal open, surface inline field errors.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Flag detail / triage` route ships:

- Row click → `navigate(/flags/{id})`.
- Detail page surfaces the originating signal (DLP report, eval run, user comment), the target resource snapshot, and `Escalate / Resolve / Reopen` actions.
- `Escalate` → opens dialog asking whether to also create a `Review` row; on confirm → POST `/admin/flags/{id}/escalate` with optional `reviewId`. Status flips to `review`.
- `Resolve` → opens dialog requiring `body` ≥12 chars; on confirm → POST `/admin/flags/{id}/resolve`. Row drops to bottom of the table with StatusPill `verified`.
- `Reopen` (only available on resolved rows) → POST `/admin/flags/{id}/reopen`; status returns to `open`.

## Severity escalation side-effects

- `severity === 'high'` flag creation MUST page on-call via the `PagerDuty` integration; the dispatch is asynchronous to flag creation. The UI does NOT block on PagerDuty acknowledgement.
- `severity === 'high'` flags older than 24h MUST surface a banner at the top of the dashboard (cross-link not enforced in v0.4 prototype).

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `flag.created`, `flag.escalated`, `flag.resolved`, `flag.reopened` from a tenant-scoped WebSocket. The sidebar badge MUST stay in sync.

## Empty / error states

- **No rows** → render the table chrome with one body row text `No flags raised. Quiet day.`
- **5xx** → render chrome + body row `Couldn't load flags. Try again.` and a top banner with `Retry`.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.

## Accessibility

- Severity pill colour MUST be paired with the severity word (already true in source).
- StatusPill colour MUST be paired with the displayed status word.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
