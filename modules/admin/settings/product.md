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

# Admin · Settings module — Registry-wide configuration

## Purpose

Specify the **`/settings` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page exposes the four categories of registry-wide configuration: identity, sovereignty defaults, audit & retention, and branding.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/settings'` → `ADMIN_PAGES.AdminSettings`) |
| Page component (`AdminSettings`) | `portals/admin-pages.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Settings"`
  - `breadcrumb=["Admin", "Settings"]`
  - Active sidebar item: `Settings` (`path: "/settings"`).

## Route body — vertical layout (`AdminSettings`)

1. **PageHeader** (no actions row)
2. **Card grid** — `p-grid p-grid-2` of 4 cards:
   - Top-left: Identity
   - Top-right: Sovereignty defaults
   - Bottom-left: Audit & retention
   - Bottom-right: Branding

This page does NOT use a `DataTable`. It is a 2-column responsive grid of form cards.

## Section copy and UI — PageHeader

- **Title:** `Settings`
- **Subtitle:** `Registry-wide configuration.`
- **Actions row:** none. (Save is per-card or implicit-on-blur in production; v0.4 has no Save button.)

## Section copy and UI — Identity card

- **Card title** (`p-card-title`, `marginBottom: 14`): `Identity`
- **Fields** (each `<div class="p-field"><label>...</label><input/select.../></div>`):
  - `Primary IdP` — `<input class="p-input">` defaultValue `gov.mu OIDC`
  - `MFA enforcement` — `<select class="p-input p-select">` defaultValue `all`
    - Options: `All roles` (`all`) · `Admins only` (`admin`)
  - `Session lifetime` — `<input class="p-input">` defaultValue `8h`

## Section copy and UI — Sovereignty defaults card

- **Card title:** `Sovereignty defaults`
- **Fields:**
  - `Default tier for new resources` — `<select>` defaultValue `Tier-2`
    - Options: `Tier-1`, `Tier-2`, `Tier-3` (values match labels)
  - `Egress posture` — `<select>` defaultValue `logged`
    - Options: `blocked`, `logged`, `open` (values match labels)
  - `DPIA threshold` — `<input>` defaultValue `any-PII`

## Section copy and UI — Audit & retention card

- **Card title:** `Audit & retention`
- **Fields:**
  - `Retention` — `<input>` defaultValue `7 years`
  - `Notarisation cadence` — `<input>` defaultValue `hourly`
  - `Archive bucket` — `<input>` defaultValue `s3://air-audit-mu`

## Section copy and UI — Branding card

- **Card title:** `Branding`
- **Fields:**
  - `Public name` — `<input>` defaultValue `Sovereign AI Registry`
  - `Support email` — `<input>` defaultValue `registry@gov.mu`
  - `Status page` — `<input>` defaultValue `status.air.gov.mu`

## Visual and motion

- Each card is a standard `p-card` with the same gradient border treatment.
- `p-field` is `display: flex; gap: 12; align-items: center; padding: 10 0` per `portal-styles.css`; the label is fixed width and the input fills the remainder.
- `.p-input` has subtle inner shadow + focus ring `var(--primary)`.
- The card grid is responsive: at narrow widths it collapses to a single column (per shared `p-grid-2` rules).
- The page does NOT animate cards on mount (no `Reveal` wrapping); they appear on the same paint as the shell.

## Cross-referenced settings (drive other modules)

| Field | Drives |
|-------|--------|
| `Primary IdP` | All portal sign-ins; bound to `gov.mu OIDC` claim issuer. |
| `MFA enforcement` | Per-role MFA gate; `all` is the safe default surfaced in `modules/admin/users` permissions. |
| `Session lifetime` | All portal sessions; the dashboard's `permissions.md` references this default. |
| `Default tier for new resources` | Initial `sov` value when a new `Resource` is created. |
| `Egress posture` | Drives `pol_egress_default` policy parameters; mismatching the policy must surface a warning banner. |
| `DPIA threshold` | Drives `pol_dpia_required` matching; `any-PII` is the v0.4 default. |
| `Retention` | Drives `pol_audit_retention` parameters. |
| `Notarisation cadence` | How often `audit.notarize` runs (hourly default). |
| `Archive bucket` | Storage path for the `kind === 'storage'` integration that backs the audit archive. |
| `Public name` | Surfaced on the public site footer brand line, the portal sidebar logo, and status page header. |
| `Support email` | Surfaced on the public Contact page (`#/contact`) and on every error page footer. |
| `Status page` | Driven by the `Open status page` action on `/dashboard`. |

## Save behaviour

- Prototype: there is no Save mechanism — fields are uncontrolled `defaultValue` inputs that accept edits but do not persist.
- Production-recommended: implicit `Save` on field blur with a 250ms debounce. Each card emits a card-scoped PATCH (`/admin/settings/identity`, `/admin/settings/sovereignty`, `/admin/settings/audit`, `/admin/settings/branding`). On success a brief toast `Settings saved` confirms; on failure the field reverts and surfaces an inline error.
- Alternative: a sticky footer with explicit `Save changes` / `Discard` buttons that appears once any field is dirty. Production tenant choice.

## Out of scope on this page

- Per-tenant theme customisation (planned).
- Fine-grained role / scope policy editor (lives at `/policies`).
- Backup / restore of settings (operations-team-only, separate surface).
