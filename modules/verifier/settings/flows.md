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

# Verifier · Settings module — Flows

## Routing

- Route lives at `/settings` of the verifier portal hash router — last item in the sidebar.
- Activated via sidebar `Settings` (anchor `href="#/settings"`).
- Active match: exact `'/settings'` OR `path.startsWith('/settings/')`.

## Initial render

1. App resolves `path === '/settings'` → renders `<VerSettings/>`.
2. Production: GET `/verifier/settings` runs on mount; the five fields populate from the response.
3. Prototype: each input / select uses `defaultValue` (or first option for the select); values are not bound to React state and are not persisted.
4. The 2-column card grid paints synchronously.
5. Production: emit `verifier.settings.viewed` after first paint.

## Save flows (production)

### Pattern A — Implicit save on blur (recommended)

- Field edit → debounced 250ms → SPA composes a single-field merge patch and PATCHes `/verifier/settings`.
- On 200: brief toast `Settings saved` (auto-dismiss 2s).
- On 400 (validation): inline error under the field; value reverts after 3s if uncorrected.
- On 5xx: inline error + top banner `Couldn't save — retrying…`. SPA retries up to 3 times with backoff.
- Emit `verifier.settings.field.changed` per change and `verifier.settings.<card>.saved` per successful PATCH.

### Pattern B — Explicit save footer

- Any dirty field reveals a sticky footer with `Save changes` (primary) and `Discard` (ghost) buttons.

## Per-field flows

### Flow 1 — Change `Display name`

- No confirmation required.
- Server validates loosely against the IdP claim; production rejects with 422 if the change drifts too far.
- On save, the new name surfaces immediately in the user menu and on subsequent audit-ledger entries; historical entries keep the prior name.

### Flow 2 — Change `Collegium`

- Server validates that the new value is a known collegium for which the actor holds membership; production rejects with 422 `Unknown collegium or no membership.`
- On save, the new label surfaces alongside the verifier email on `/decided` and signed reports going forward.

### Flow 3 — Change `Specialisation`

- Free-form in v0.4. Production should converge on a closed taxonomy and validate against it.
- On save, the routing system uses the new tags to nudge matching reviews toward this verifier.

### Flow 4 — Change `Default stage`

- No confirmation required.
- On save, the next time the verifier opens `/queue` directly (not from the dashboard's `Open next in queue`), the stage filter pre-selects the new value.

### Flow 5 — Change `Max concurrent`

- Server validates `1 ≤ value ≤ 20`; production rejects with 422 outside this range.
- On save, increases take effect immediately for the next assignment cycle. Decreases take effect on the NEXT row assignment — in-flight rows continue.
- Emit `verifier.settings.maxConcurrent.changed` with `from` and `to` so the routing system can recompute slack.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on `visibilitychange`. Settings change rarely but a page-revisit after another seat updated should surface the latest.
- On conflict (concurrent save from another tab), the SPA surfaces a banner `Settings changed elsewhere. Reload to see the latest.`

## Empty / error states

- This page does not have an "empty" state — every verifier seat has settings.
- **5xx on initial GET** → render PageHeader + a single full-width error card: `Couldn't load settings.` with `Retry` button.
- **401/403** → redirect to verifier sign-in / "Insufficient permissions" empty.

## Accessibility

- Each `p-field` MUST associate the `<label>` with its input via `for`/`id` (the prototype source uses bare `<label>` tags; production must add the binding).
- Keyboard tab order: Display name → Collegium → Specialisation → Default stage → Max concurrent.
- Specialisation field allows free-form text including the Unicode middle dot U+00B7; ensure input handling passes the character cleanly.

## Cross-portal cross-references

- The `Display name` here cross-references `modules/admin/users` (where the admin sees the user's name in the operator table).
- The `Collegium` here cross-references signed reports on `/reports` and decision rows on `/decided`.
- The `Default stage` here cross-references `/queue` (the initial filter).
- The `Max concurrent` here cross-references the routing system's load-balancing logic; documented in `airegistry-specs/governance/`.
