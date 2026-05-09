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

# Admin · Settings module — Permissions and access

## Surface classification

The Settings route is **authenticated** and **role-gated**. Reading settings requires `admin`. Every PATCH endpoint requires `admin` + scope `global` because all settings are tenant-wide and security-sensitive.

## Required roles

To reach `portals/admin.html#/settings`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To save settings (production endpoints):

- `PATCH /admin/settings/identity` → `admin` + scope `global`.
- `PATCH /admin/settings/sovereignty` → `admin` + scope `global`.
- `PATCH /admin/settings/audit` → `admin` + scope `global`.
- `PATCH /admin/settings/branding` → `admin` + scope `global`.

Some changes warrant **second-actor approval** (4-eyes). Production tenants MAY require this for:

- `identity.primaryIdp` (changes the IdP wholesale).
- `identity.mfaEnforcement` lowering from `all` to `admin`.
- `audit.retention` shortening below the prior value.
- `audit.archiveBucket` (rebinding the audit archive).

The 4-eyes flow holds the PATCH in pending state until a second admin co-approves; the SPA surfaces a `Pending co-approval` banner during the wait.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Settings` | `admin` | Sidebar gated by portal entry. |
| Identity card fields | `admin` (read), `admin` + `global` (save) | Save fails with 403 without scope. |
| Sovereignty card fields | `admin` (read), `admin` + `global` (save) | |
| Audit card fields | `admin` (read), `admin` + `global` (save) | |
| Branding card fields | `admin` (read), `admin` + `global` (save) | |
| `Save changes` footer (Pattern B) | `admin` + `global` | Disable with tooltip if scope insufficient. |

## Sensitive value handling

- **`identity.primaryIdp`** — display label. The actual issuer / client id / scopes live on the matching `kind === 'identity'` integration; secrets are NEVER returned by this endpoint.
- **`audit.archiveBucket`** — bucket URI; not sensitive, but cross-checks against an active storage integration.
- **`branding.supportEmail`** — surfaces on user-visible pages; production should validate it against a deny-list of disposable email domains.
- **`branding.statusPage`** — hostname only; the SPA prepends `https://` at click time. Production MUST reject hostnames with embedded credentials or paths.

## Audit obligations

Every PATCH writes a row to the immutable audit ledger with the parent `traceId`:

- `PATCH /admin/settings/identity` → one of `settings.identity.<field>.changed` per dirty field (e.g. `settings.identity.mfaEnforcement.changed` capturing prior and new value).
- `PATCH /admin/settings/sovereignty` → `settings.sovereignty.<field>.changed`.
- `PATCH /admin/settings/audit` → `settings.audit.<field>.changed`.
- `PATCH /admin/settings/branding` → `settings.branding.<field>.changed`.

For 4-eyes-gated changes, two ledger rows are written: one when the change is staged (`<event>.staged`), one when the second actor co-approves (`<event>.applied`).

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **`admin` without `global` scope edits a field:** the input may accept the keystrokes (uncontrolled), but `Save` returns 403; preferred UX is to disable inputs up-front and surface a tooltip `Read-only without sovereignty-board role.`
- **Validation error (400):** inline error under the field; value reverts after 3s if not corrected.
- **Conflict with active integration (e.g. `archiveBucket` mismatch):** 422 with detail describing the missing integration; SPA surfaces an `Add a storage integration` link.
- **Concurrent save (409):** SPA surfaces a banner `Settings changed by ${updatedBy}. Reload to see the latest.` rather than overwriting silently.

## Data residency

- Settings are tenant-scoped; one row per tenant.
- Cross-tenant settings replication is **not** implied by v0.4.
- Branding changes affect public-facing pages — they MUST NOT leak any non-public tenant identifier (e.g. internal sovereign-board codenames). The product surface only accepts the four documented branding fields.

## Read-only vs write-capable across other roles

Although the Settings page is admin-only, the **values** of these settings drive guards across other modules:

- `identity.mfaEnforcement` is consulted by every portal sign-in; production MUST refuse session issuance for users whose MFA enrolment is below the floor.
- `sovereignty.egressPosture` is consulted by `pol_egress_default`; non-admins indirectly see the effect when egress calls are blocked or logged.
- `audit.retention` is consulted by the storage worker that prunes old blocks; non-admins never see the value but observe shrinking history.
- `branding.*` fields surface on user-visible pages and so are visible to every audience.
