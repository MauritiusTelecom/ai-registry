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

# Admin · Policies module — Policy-as-code definitions

## Purpose

Specify the **`/policies` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every policy-as-code definition that the registry enforces — egress, PII, external models, DPIA, audit retention.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/policies'` → `ADMIN_PAGES.AdminPolicies`) |
| Page component (`AdminPolicies`) | `portals/admin-pages.jsx` |
| Mock policies (`ADMIN_POLICIES`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Policies"`
  - `breadcrumb=["Admin", "Governance", "Policies"]`
  - Active sidebar item: `Policies` (`path: "/policies"`).

## Route body — vertical layout (`AdminPolicies`)

1. **PageHeader**
2. **DataTable** — full width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Policies`
- **Subtitle:** `Policy-as-code definitions enforced across the registry.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `New policy`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Policy` | (auto) | Stack: top `name` (strong); bottom `id` (`p-cell-meta`) |
| `scope` | `Scope` | 130 | `<span class="p-tag">{scope}</span>` |
| `version` | `Version` | 100 | `<span class="p-mono-val">{version}</span>` |
| `updated` | `Updated` | 130 | `<span class="p-mono-key">{updated}</span>` |
| `enforced` | `Enforced` | 110 | mono 11px uppercase letter-spacing `.08em`; text `YES` if `enforced === true`, `NO` if `false`; colour `#10b981` when YES, `var(--p-text-3)` when NO |

Rows bind to `A.policies` (no filtering, no sorting in v0.4). The table is **non-interactive** in the prototype (no `onRowClick` passed).

## Mock policies — `ADMIN_POLICIES`

Reproduce verbatim from `admin-data.jsx`:

| id | name | scope | version | updated | enforced |
|---|---|---|---|---|---|
| pol_egress_default | Default egress policy | all | v3.2 | 2026-05-07 | true |
| pol_pii_handling | PII handling | tier-1 | v2.4 | 2026-04-22 | true |
| pol_external_models | External model access | tier-3 | v1.7 | 2026-05-01 | true |
| pol_dpia_required | DPIA required | restricted | v1.1 | 2026-03-09 | true |
| pol_audit_retention | Audit retention | all | v4.0 | 2026-02-14 | true |

All five v0.4 mock policies have `enforced === true`. Production rows MAY be `false` — keep the colour mapping (`#10b981` vs `--p-text-3`) intact.

## Visual and motion

- Enforcement column is **colour-paired with text** (`YES` / `NO` letters), so the cell remains accessible without colour. Production must keep the uppercase text label.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.

## Navigation behaviour

- `New policy` (header primary): no-op stub in prototype. Production opens a policy authoring flow (creator picks `scope`, attaches a Rego/CEL/etc body, sets `enforced` flag).
- Row click: not bound on this page; planned for production once a policy detail / version-history route ships.

## Out of scope on this page

- Policy editor / language semantics.
- Version history / diff view (planned).
- Per-policy violation surfacing (lives at `/flags` once tied to a `pol_*` rule and at the audit log).
