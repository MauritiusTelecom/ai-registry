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

# Admin · Settings module — Flows

## Routing

- Route lives at `/settings` of the admin portal hash router.
- Activated when sidebar item `Settings` is clicked (anchor `href="#/settings"`). It is the last item in the sidebar.
- Active match: exact `'/settings'` OR `path.startsWith('/settings/')`.

## Initial render

1. `AdminApp` resolves `path === '/settings'` → renders `<AdminSettings/>`.
2. Production: GET `/admin/settings` runs on mount; the four cards' fields are populated from the response.
3. Prototype: each `<input>` and `<select>` uses `defaultValue`; values are not bound to React state and are not persisted.
4. The 2-column card grid paints synchronously.
5. Production: emit `admin.settings.viewed` after first paint.

## Save flows (production)

There are two save patterns; tenants pick one and stick with it.

### Pattern A — Implicit save on blur (recommended)

- Field edit → debounced 250ms → SPA composes a single-field merge patch and sends it to the card-scoped endpoint.
- On 200: brief toast `Settings saved` (auto-dismiss 2s); the card briefly highlights the saved field with a 600ms fade.
- On 400 (validation): inline error under the field, no toast, value reverts to last-known-good after 3s if the user does not correct it.
- On 5xx: inline error under the field plus a top banner `Couldn't save — retrying…`; SPA retries up to 3 times with backoff.
- Emit `admin.settings.field.changed` per change and `admin.settings.<card>.saved` per successful PATCH.

### Pattern B — Explicit save footer

- Any dirty field reveals a sticky footer with `Save changes` (primary) and `Discard` (ghost) buttons plus a `<n> changes pending` mono counter.
- `Save changes` issues PATCH per dirty card (parallel where possible) and then dismisses the footer on success.
- `Discard` resets each dirty field to its last-known value and dismisses the footer.
- Emit `admin.settings.<card>.saved` per successful PATCH.

## Per-card flows

### Identity card

#### Flow 1 — Change `Primary IdP`

- This change forces a tenant-wide sign-out on next request because the issuer / audience claim no longer matches existing tokens.
- Production MUST surface a confirmation dialog before saving:
  - Title: `Change identity provider?`
  - Body: `All current sessions will end on the next request and operators will need to sign in again with ${newIdp}.`
  - Confirm label: `Change provider`
  - Cancel label: `Keep ${currentIdp}`
- Emit `admin.settings.idp.warning_shown` when the dialog opens; emit `admin.settings.identity.saved` only after the operator confirms and the PATCH succeeds.

#### Flow 2 — Change `MFA enforcement` to `admin`

- Lowering MFA enforcement is a security-sensitive change.
- Production MUST surface a confirmation dialog:
  - Title: `Lower MFA enforcement?`
  - Body: `Provider, verifier and sovereign roles will no longer require MFA. This is rarely the right choice for production.`
  - Confirm label: `Lower enforcement`
  - Cancel label: `Keep 'All roles'`

#### Flow 3 — Change `Session lifetime`

- No confirmation needed.
- Production validates the duration server-side. Reasonable bounds: ≥30m and ≤30d.

### Sovereignty defaults card

#### Flow 4 — Change `Egress posture` to `open`

- Setting egress to `open` may conflict with the current `pol_egress_default` policy.
- Production MUST surface a warning banner inside the card:
  - `'open' egress matches no enforcement; pol_egress_default may need an update on /policies.`
- Save proceeds regardless; the operator's responsibility to align the policy.

#### Flow 5 — Change `Default tier`

- No confirmation needed.
- New resources created after the save will receive the new default; existing resources are unaffected.

### Audit & retention card

#### Flow 6 — Change `Archive bucket`

- The new value MUST match an active `kind === 'storage'` integration (see `/admin/integrations`).
- If the value does not match, PATCH returns 422 with detail `No active storage integration matches that bucket.`
- The SPA surfaces an inline link `Add a storage integration` that navigates to `/integrations`.

#### Flow 7 — Change `Retention`

- Reducing retention below the legal floor is server-rejected with 422.
- Increasing retention is allowed; existing audit data is retained for the longer of the prior and new windows.

### Branding card

#### Flow 8 — Change `Public name`, `Support email`, `Status page`

- No confirmation needed beyond field validation.
- Changes propagate to:
  - Public site footer brand line and portal sidebar logo (`publicName`).
  - Public Contact page and error footers (`supportEmail`).
  - Dashboard `Open status page` action target (`statusPage`).
- The SPA SHOULD invalidate the public-site cache on save so the user-facing change is visible quickly.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `settings.changed` (in case another admin saves concurrently). On conflict (concurrent save), the SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.` rather than overwriting silently.

## Empty / error states

- This page does not have an "empty" state — every tenant has settings.
- **5xx on initial GET** → render PageHeader + a single full-width error card: `Couldn't load settings.` with `Retry` button.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.

## Accessibility

- Each `p-field` MUST associate the `<label>` with its input via `for`/`id` (the prototype source uses bare `<label>` tags; production must add the binding).
- Keyboard tab order MUST traverse cards in reading order: Identity → Sovereignty → Audit → Branding.
- Confirmation dialogs MUST be `role="alertdialog"` and trap focus until dismissed.
