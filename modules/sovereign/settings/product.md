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

# Sovereign · Settings module — Sovereign profile

## Purpose

Specify the **`/settings` route** of the Sovereign portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page exposes the active sovereign authority's profile — operator name, authority label, and reporting cadence. It is intentionally narrow: the sovereign role is observational, not configurational.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/sovereign.html` |
| Route table | `portals/sovereign-app.jsx` (`'/settings'` → `SOV_PAGES.SovSettings`) |
| Page component (`SovSettings`) | `portals/sovereign-pages.jsx` |
| Shared shell (`PageHeader`) | `portal-shell.jsx` |
| Portal design tokens (forms, fields) | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Sovereign`
- `PortalShell` overrides:
  - `currentTitle="Settings"`
  - `breadcrumb=["Sovereign", "Settings"]`
  - Active sidebar item: `Settings` (`path: "/settings"`).

## Route body — vertical layout (`SovSettings`)

1. **PageHeader** (no actions row, no subtitle)
2. **Single card** — one `p-card` with `maxWidth: 640`

This page does NOT use a card grid. It is a single narrow form card.

## Section copy and UI — PageHeader

- **Title:** `Settings`
- **Subtitle:** none.
- **Actions row:** none. Save is implicit-on-blur in production; v0.4 has no Save button.

## Section copy and UI — Sovereign profile card

- **Card title** (`p-card-title`, `marginBottom: 14`): `Sovereign profile`
- **Fields** (each `<div class="p-field"><label>...</label><input/select.../></div>`):
  - `Operator` — `<input class="p-input">` defaultValue `Marie Laurent`
  - `Authority` — `<input class="p-input">` defaultValue `Ministry of Finance, Republic of Mauritius`
  - `Reporting cadence` — `<select class="p-input p-select">` (no defaultValue — first option selected). Options: `weekly`, `monthly`, `quarterly`

The card has no Save / Discard footer in v0.4.

## Cross-referenced settings

| Field | Drives |
|-------|--------|
| `Operator` | Display name in the top-bar user menu and audit ledger entries from this seat. |
| `Authority` | Subtitle of the Sovereign dashboard PageHeader (`${authorityName} — strategic view across the registry.`). |
| `Reporting cadence` | Frequency at which national reports surface on `/reports` (weekly / monthly / quarterly). Drives an internal scheduler (production). |

## Save behaviour

- Prototype: there is no Save mechanism — fields are uncontrolled `defaultValue` inputs that accept edits but do not persist.
- Production-recommended: implicit `Save` on field blur with a 250ms debounce. PATCH `/sovereign/settings` with the dirty fields. On success a brief toast `Settings saved` confirms.
- Alternative: a sticky footer with explicit `Save changes` / `Discard` buttons that appears once any field is dirty.

## Visual and motion

- The single card is centred at `maxWidth: 640` with the standard `p-card` gradient border.
- `p-field` lays out label + input vertically (per `portal-styles.css`).
- `.p-input` has a focus ring `var(--primary)` and subtle inner shadow.

## Difference vs admin/settings and provider/settings

| Concern | Admin /settings | Provider /settings | Sovereign /settings |
|---|---|---|---|
| Card count | 4 (Identity / Sovereignty / Audit / Branding) | 2 (Organisation / Notifications) | 1 (Sovereign profile) |
| Field count | 12 | 6 | 3 |
| Title | `Settings` | `Provider settings` | `Settings` |
| MaxWidth | full grid | 2-column grid | 640 (single narrow card) |
| Save pattern | implicit on blur (production) | implicit on blur (production) | implicit on blur (production) |

## Out of scope on this page

- IdP / MFA configuration — admin-side only.
- Branding (logos, colours) — admin-side only.
- Audit retention / archive bucket — admin-side only.
- Per-user notifications — provider-side only.
- The sovereign profile is intentionally minimal in v0.4; the role is operational rather than configurational.
