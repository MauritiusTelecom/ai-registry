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

# Admin · Integrations module — Permissions and access

## Surface classification

The Integrations route is **authenticated** and **role-gated** (`admin`). Reading the list requires `admin`. Adding, configuring, testing, revoking, or viewing logs of integrations requires `admin` + scope `global` because integrations carry credentials with broad blast radius.

## Required roles

To reach `portals/admin.html#/integrations`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on integrations (production endpoints):

- `POST /admin/integrations` (`Add integration`) → `admin` + scope `global`.
- `PATCH /admin/integrations/{id}` (`Configure` save) → `admin` + scope `global`.
- `POST /admin/integrations/{id}/test` → `admin` + scope `global`.
- `POST /admin/integrations/{id}/revoke` → `admin` + scope `global` AND second-actor approval (4-eyes for revocation).
- `GET /admin/integrations/{id}/logs` → `admin`.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Integrations` | `admin` | Sidebar gated by portal entry. |
| `Add integration` (header) | `admin` + scope `global` | Surface tooltip if scope insufficient. |
| `Configure` (per card) | `admin` + scope `global` | Drawer mounts but Save/Test/Revoke fail without scope. |
| `Logs` (per card) | `admin` | Read-only stream. |
| StatusPill render | `admin` | Cosmetic; reflects upstream health. |

## Sensitive cell handling

- **Integration secrets** (client secrets, API tokens, webhook signing keys) MUST NEVER appear in the list response or in any card body. The detail endpoint returns the sentinel `<set>` with masked length; only the `Rotate` flow generates a new value, and the new value is shown ONCE on creation/rotation in the drawer body, then replaced by `<set>`.
- **`config` object** in the detail endpoint may contain non-secret fields (issuer URL, channel name); these render verbatim.
- **Revoked integrations** retain non-secret config but their secrets are zeroised server-side.

## Audit obligations

Every state-changing call writes to the audit ledger with the parent `traceId`:

- POST `/admin/integrations` → `integration.create` (capturing `kind` and non-secret config).
- PATCH `/admin/integrations/{id}` → `integration.update` (capturing the diff of non-secret config; secret rotations write `integration.secret_rotated` separately).
- POST `/admin/integrations/{id}/test` → `integration.test` (capturing `ok` and `latencyMs`).
- POST `/admin/integrations/{id}/revoke` → `integration.revoke` (capturing `reason` and the second-actor approver).
- A status-change push event writes `integration.status_changed` (system-driven, capturing prior and new status).

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **`admin` without `global` scope clicks `Add integration` / `Configure` Save:** UI MAY surface the modal/drawer but submit returns 403; preferred UX is to disable the button up-front.
- **Revoke without 4-eyes:** 403 with detail `Revocation requires a second admin to co-approve.` UI MUST collect the co-approver email or wait for an approval token before retrying.
- **Critical kind revocation:** revoking the only `kind === 'identity'` integration of a tenant is blocked with 422 `Cannot revoke the only identity integration; add another first.`

## Data residency

- Integration rows are tenant-scoped via session-derived `tenantId`.
- Webhook outbound calls MUST honour the tenant's egress policy (`Settings → Sovereignty defaults → Egress posture`); a tenant set to `blocked` cannot create `notify`-kind integrations that egress externally.
- Integration logs are tenant-scoped and stored with the same retention policy as the audit log (`Settings → Audit & retention → Retention`).
