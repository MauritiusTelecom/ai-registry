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

# Sovereign · Settings module — Flows

## Routing

- Route lives at `/settings` of the sovereign portal hash router.
- Activated via sidebar `Settings` (anchor `href="#/settings"`) — last item in the sidebar.
- Active match: exact `'/settings'` OR `path.startsWith('/settings/')`.

## Initial render

1. App resolves `path === '/settings'` → renders `<SovSettings/>`.
2. Production: GET `/sovereign/settings` runs on mount; the three fields populate from the response.
3. Prototype: each input / select uses `defaultValue`; values are not bound to React state and are not persisted.
4. The single card paints synchronously.
5. Production: emit `sovereign.settings.viewed` after first paint.

## Save flows (production)

### Pattern A — Implicit save on blur (recommended)

- Field edit → debounced 250ms → SPA composes a single-field merge patch and PATCHes `/sovereign/settings`.
- On 200: brief toast `Settings saved` (auto-dismiss 2s).
- On 400 (validation): inline error under the field; value reverts after 3s if uncorrected.
- On 5xx: inline error + top banner `Couldn't save — retrying…`. SPA retries up to 3 times with backoff.
- Emit `sovereign.settings.field.changed` per change and `sovereign.settings.saved` per successful PATCH.

### Pattern B — Explicit save footer

- Any dirty field reveals a sticky footer with `Save changes` (primary) and `Discard` (ghost) buttons.

## Per-field flows

### Flow 1 — Change `Operator`

- No confirmation required.
- Server validates: the new operator name MUST belong to a current sovereign-role user for this authority. Production rejects with 422 `Operator must be a current sovereign-role user.`
- On save, the new name surfaces immediately in the user menu and on subsequent audit-log entries.

### Flow 2 — Change `Authority`

- Authority changes are governance-sensitive. Production should:
  - Surface a confirmation dialog: `Change authority?` with body `This changes the published display label across the public site, dashboard, and all national reports.`
  - On confirm → PATCH and propagate the change.
- The change does NOT alter the underlying tenant id; it only updates the display label.

### Flow 3 — Change `Reporting cadence`

- No confirmation required for cadence change.
- On save → PATCH and emit `sovereign.settings.cadence.changed` with `from` and `to`.
- The next-scheduled-report timestamp recalculates based on the new cadence:
  - `weekly` → next Monday morning
  - `monthly` → first business day of next month
  - `quarterly` → first business day of next Apr / Jul / Oct / Jan
- Existing scheduled reports are NOT cancelled; they fire on their existing schedule.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on `visibilitychange` AND on push events `settings.changed`. On conflict (concurrent save), the SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.`

## Empty / error states

- This page does not have an "empty" state — every sovereign tenant has a profile.
- **5xx on initial GET** → render PageHeader + a single full-width error card: `Couldn't load settings.` with `Retry` button.
- **401/403** → redirect to sovereign sign-in / "Insufficient permissions" empty.

## Accessibility

- Each `p-field` MUST associate the `<label>` with its input via `for`/`id` (the prototype source uses bare `<label>` tags; production must add the binding).
- Keyboard tab order: Operator → Authority → Reporting cadence.
- The reporting cadence options should expose `aria-label` describing the schedule (e.g. `Weekly: Monday morning each week`).
