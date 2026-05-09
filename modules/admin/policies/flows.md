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

# Admin · Policies module — Flows

## Routing

- Route lives at `/policies` of the admin portal hash router.
- Activated when sidebar item `Policies` is clicked (anchor `href="#/policies"`).
- Active match: exact `'/policies'` OR `path.startsWith('/policies/')`.

## Initial render

1. `AdminApp` resolves `path === '/policies'` → renders `<AdminPolicies/>`.
2. `AdminPolicies` reads `A.policies` directly (no local state in prototype).
3. `DataTable` paints synchronously with all 5 mock rows in document order.
4. Production: emit `admin.policies.viewed` after first paint.

## Header action

### Flow 1 — New policy

- Click → no-op stub in prototype.
- Production: open the policy authoring flow (recommended path: `/policies/new`). The form captures:
  - **Name** — display label.
  - **Scope** — picker over `all`, `tier-1`, `tier-2`, `tier-3`, `restricted`, plus tenant-defined custom scopes.
  - **Body** — policy source (Rego/CEL/etc) in a code editor.
  - **Shadow run** — toggle, default `on`. New policies start in shadow mode and cannot enforce until 24h of dry-run accumulates.
- On submit → POST `/admin/policies`. Initial version is `v1.0`, `enforced: false`.
- Emit `admin.policies.action.new_policy.clicked` on button click and `admin.policies.policy.published` on 201.

## Version publish flow (production)

- From a policy detail / version-history route (out of scope here):
  - Author edits the policy body and chooses `bumpVersion: minor | major`.
  - Submit → POST `/admin/policies/{id}/versions`. Server assigns the next version, recomputes the hash, supersedes the previous active row.
  - Active row in this list updates immediately; emit `admin.policies.policy.published`.

## Enforcement toggle (production)

- From a policy detail route:
  - User toggles `enforced` and supplies a `body` (≥12 chars).
  - Submit → POST `/admin/policies/{id}/enforce`.
  - Server enforces the 24h shadow guard for `enforced=true`; on rejection it returns `422`.
  - On success: row colour flips between `#10b981` (YES) and `var(--p-text-3)` (NO); emit `admin.policies.policy.enforcement_changed`.

## Row interaction (production)

The prototype DataTable does not bind `onRowClick`. Once a `Policy detail` route ships:

- Row click → `navigate(/policies/{id})`.
- Detail page surfaces the active body, the version timeline, recent violations (cross-link to `/audit` filtered on `policy.violation`), and `Edit / Toggle enforce` actions.

## Auto-refresh

- Prototype: none.
- Production-recommended: refetch on visibility change AND on push events `policy.published`, `policy.enforcement_changed`. The table animates the row that changed (subtle background flash) per shell convention.

## Empty / error states

- **No rows** → render the table chrome with one body row text `No policies defined.` and a CTA below `Create your first policy`.
- **5xx** → render chrome + body row `Couldn't load policies.` and a top banner with `Retry`.
- **401/403** → redirect to admin sign-in / "Insufficient permissions" empty.

## Accessibility

- The `Enforced` cell pairs colour with the literal text `YES` / `NO`, so it remains accessible without colour.
- Table rows are non-interactive in v0.4; do NOT set `tabindex="0"` until row click ships.
- Version cell text is mono and small (`p-mono-val`); production must keep contrast ≥4.5:1 against `--p-card-bg`.
