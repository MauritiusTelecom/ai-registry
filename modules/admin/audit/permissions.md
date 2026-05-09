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

# Admin · Audit module — Permissions and access

## Surface classification

The Audit route is **authenticated** and **role-gated** (`admin`). The audit ledger itself is **append-only**; no UI surface in any portal can mutate or remove a row. Read access is broad to admins; export and verify are privileged but non-mutating.

## Required roles

To reach `portals/admin.html#/audit`:

- The session must hold the `admin` role for the active sovereign tenant.
- MFA mandatory.

To act on the audit log (production endpoints):

- `GET /admin/audit` → `admin`.
- `GET /admin/audit/{id}` → `admin`.
- `GET /admin/audit/export.csv` → `admin` + scope `global`. (Bulk export is privileged.)
- `GET /admin/audit/export.jsonl` → `admin` + scope `global`.
- `POST /admin/audit/verify` → `admin` + scope `global`. (Verification jobs are expensive and tenant-wide.)
- `GET /admin/audit/verify/{jobId}` → `admin`.
- `GET /admin/audit/blocks` → `admin`.

There are **no write endpoints** on the audit ledger. The only way new rows arrive is from upstream actions in other modules emitting their canonical action records.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Sidebar item `Audit log` | `admin` | Sidebar gated by portal entry. |
| `Export` (header) | `admin` + scope `global` | Bulk export is privileged. Production may surface a tooltip if scope insufficient. |
| `Verify integrity` (header) | `admin` + scope `global` | Job is tenant-wide. |
| DataTable rows | `admin` | Non-interactive on this page in v0.4. |
| Record detail (production) | `admin` | Read-only inspector. |

## Sensitive cell handling

- **`actor`** values include human emails. Respect `audit.actor.redact` policy:
  - When enabled and the actor is a human, the cell renders the SHA-256 prefix of the email instead (e.g. `actor:a14b…`).
  - The full email remains in the export ONLY if the actor invoking export holds scope `global`; lesser scopes get the redacted form even in CSV/JSONL.
- **`target`** values may include human emails (e.g. `user.invite` rows). Same redaction policy applies.
- **`sig`** is a truncated public hash; not sensitive.
- **`sigFull`** (detail endpoint) is also a public hash; not sensitive but included only on per-record fetch.

## Read-only invariants the UI must respect

- The page MUST NOT offer any "delete row" or "edit row" affordance under any role. The product surface is read-only by design.
- `result === 'fail'` rows MUST be displayed in the same table — they are part of the immutable record.
- The `Verify integrity` action MUST NEVER attempt to "fix" mismatches; it only detects and opens an incident.

## Audit obligations of operating on this page

Operating on the audit log writes its own audit rows:

- `GET /admin/audit/export.*` → writes `audit.export` (with `from`/`to`/`format`/`actor`).
- `POST /admin/audit/verify` → writes `audit.verify.started`; final state writes `audit.verify.ok`, `audit.verify.mismatch`, or `audit.verify.error`.
- Read-only paginated `GET /admin/audit` does NOT write to the ledger; it MAY emit telemetry only.

## Negative cases

- **Authenticated, no `admin`:** 403 server-side; SPA renders "You don't have admin access" empty state.
- **`admin` without `global` scope clicks `Export` or `Verify integrity`:** SPA SHOULD pre-disable the buttons with a tooltip (`Requires sovereignty-board role`).
- **Verify mismatch:** the SPA opens an incident automatically (server-driven). The user MUST NOT be able to dismiss the toast without acknowledging.
- **Stale `asOfBlock` between view and verify:** on verify completion, the SPA refetches the list to keep `asOfBlock` consistent.

## Data residency

- Audit rows are tenant-scoped via session-derived `tenantId`. There is no cross-tenant audit federation in v0.4.
- Notarisation (external anchor) is per-tenant; the anchor reference lives on `Block.notaryRef` (e.g. a public chain txid) but pulls no payload outside the tenant.
- Exports MUST be served with `Content-Disposition: attachment` AND `Cache-Control: no-store` so the bulk file does not linger in shared caches.
