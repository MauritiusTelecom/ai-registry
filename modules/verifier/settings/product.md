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

# Verifier · Settings module — Reviewer profile and queue preferences

## Purpose

Specify the **`/settings` route** of the Verifier portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page exposes two narrow categories of per-verifier configuration: the reviewer profile and queue preferences. The verifier role is execution-focused — settings are minimal.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/verifier.html` |
| Route table | `portals/verifier-app.jsx` (`'/settings'` → `VER_PAGES.VerSettings`) |
| Page component (`VerSettings`) | `portals/verifier-pages.jsx` |
| Shared shell (`PageHeader`) | `portal-shell.jsx` |
| Portal design tokens (forms, fields) | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Verifier`
- `PortalShell` overrides:
  - `currentTitle="Settings"`
  - `breadcrumb=["Verifier", "Settings"]`
  - Active sidebar item: `Settings` (`path: "/settings"`).

## Route body — vertical layout (`VerSettings`)

1. **PageHeader** (no actions row, no subtitle)
2. **Card grid** — `p-grid p-grid-2` of 2 cards:
   - Left: Reviewer profile
   - Right: Queue preferences

There are **no StatCards** and **no DataTable** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Settings`
- **Subtitle:** none.
- **Actions row:** none.

## Section copy and UI — Reviewer profile card

- **Card title** (`p-card-title`, `marginBottom: 14`): `Reviewer profile`
- **Fields** (each `<div class="p-field"><label>...</label><input/></div>`):
  - `Display name` — `<input class="p-input">` defaultValue `Sanjay Boodhoo`
  - `Collegium` — `<input class="p-input">` defaultValue `Sovereignty Board`
  - `Specialisation` — `<input class="p-input">` defaultValue `legal · safety`

The `Specialisation` default uses Unicode middle dot U+00B7 between `legal` and `safety`.

## Section copy and UI — Queue preferences card

- **Card title** (`p-card-title`, `marginBottom: 14`): `Queue preferences`
- **Fields:**
  - `Default stage` — `<select class="p-input p-select">` (no defaultValue — first option selected). Options: `sovereignty`, `evaluation`, `safety`
  - `Max concurrent` — `<input class="p-input">` defaultValue `4`

## Cross-referenced settings

| Field | Drives |
|-------|--------|
| `Display name` | Surfaces in the user menu and in audit-ledger entries from this seat. |
| `Collegium` | Authority label shown alongside the verifier email on `/decided`, signed reports, and audit rows. |
| `Specialisation` | Hint to the queue-routing system; reviews matching the specialisation are nudged toward this verifier first. |
| `Default stage` | Filter applied to `/queue` on initial load when the verifier opens the page directly. |
| `Max concurrent` | Caps the count of in-flight reviews assigned to this verifier; the routing system stops assigning new rows once the cap is reached. |

## Save behaviour

- Prototype: there is no Save mechanism — fields are uncontrolled `defaultValue` inputs that accept edits but do not persist.
- Production-recommended: implicit `Save` on field blur with a 250ms debounce. PATCH `/verifier/settings` with the dirty fields. On success a brief toast `Settings saved` confirms.
- Alternative: a sticky footer with explicit `Save changes` / `Discard` buttons.

## Visual and motion

- Each card is a standard `p-card` with the same gradient border treatment.
- `p-field` lays out label + input vertically.
- The 2-column grid collapses to single-column at narrow widths (per shared `p-grid-2` rules).
- The page does NOT animate cards on mount.

## Difference vs admin/settings, provider/settings, sovereign/settings

For implementers familiar with the other settings modules:

| Concern | Admin /settings | Provider /settings | Sovereign /settings | Verifier /settings |
|---|---|---|---|---|
| Card count | 4 | 2 | 1 | 2 |
| Field count | 12 | 6 | 3 | 5 |
| Title | `Settings` | `Provider settings` | `Settings` | `Settings` |
| Subtitle | yes | no | no | no |
| Save pattern | implicit on blur | implicit on blur | implicit on blur | implicit on blur |
| Critical-field confirmation dialogs | yes (IdP, MFA, retention) | yes (domain) | yes (authority) | no |

## Out of scope on this page

- IdP / MFA configuration — admin-side only.
- Branding — admin-side only.
- Public profile / org-level config — admin / provider / sovereign side only.
- Personal benchmark library — production may add as a third card; v0.4 keeps the page narrow.
- Notification preferences — production may surface as a third card; v0.4 leaves notifications under the shell-level user menu.
