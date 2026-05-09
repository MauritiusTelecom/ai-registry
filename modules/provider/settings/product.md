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

# Provider · Settings module — Org and notifications

## Purpose

Specify the **`/settings` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page exposes two categories of provider-org configuration: organisation identity and notification channels.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/settings'` → `PROV_PAGES.ProvSettings`) |
| Page component (`ProvSettings`) | `portals/provider-pages.jsx` |
| Shared shell (`PageHeader`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens (forms, fields, dividers) | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Settings"`
  - `breadcrumb=["Provider", "Settings"]`
  - Active sidebar item: `Settings` (`path: "/settings"`).

## Route body — vertical layout (`ProvSettings`)

1. **PageHeader** (no actions row, no subtitle)
2. **Card grid** — `p-grid p-grid-2` of 2 cards:
   - Left: Organisation
   - Right: Notifications

This page does NOT use a `DataTable`. It is a 2-column grid of form cards (similar to `admin/settings` but with two cards instead of four).

## Section copy and UI — PageHeader

- **Title:** `Provider settings`
- **Subtitle:** none.
- **Actions row:** none. Save is per-card or implicit-on-blur in production; v0.4 has no Save button.

## Section copy and UI — Organisation card

- **Card title** (`p-card-title`, `marginBottom: 14`): `Organisation`
- **Fields** (each `<div class="p-field"><label>...</label><input/textarea/></div>`):
  - `Display name` — `<input class="p-input">` defaultValue `eduMu`
  - `Domain` — `<input class="p-input">` defaultValue `edu.gov.mu`
  - `Public bio` — `<textarea class="p-input">` defaultValue `Mauritius Ministry of Education — open educational resources, retrieval-only.`

The em dash in the public bio is a Unicode em dash (U+2014); production must keep the character.

## Section copy and UI — Notifications card

- **Card title:** `Notifications`
- **Fields:**
  - `Incident channel` — `<input class="p-input">` defaultValue `#edu-air-ops (Slack)`
  - `On-call email` — `<input class="p-input">` defaultValue `oncall@edu.gov.mu`
  - `Webhook` — `<input class="p-input">` placeholder `https://...` (no defaultValue)

## Cross-referenced settings (drive other modules)

| Field | Drives |
|-------|--------|
| `Display name` | Public profile brand line, sidebar logo sub label, portal `${providerName} — Provider portal` title in dashboard. |
| `Domain` | The provider's canonical web identity. **Read-only after onboarding** in production — changing the domain requires re-verification. |
| `Public bio` | Surfaces on the public profile page. |
| `Incident channel` | Where `severity === 'high'` incidents (per `modules/provider/incidents`) page on-call. |
| `On-call email` | Fallback / additional notification target for incidents and renewal reminders. |
| `Webhook` | Optional outbound webhook for incident lifecycle events. |

## Save behaviour

- Prototype: there is no Save mechanism — fields are uncontrolled `defaultValue` inputs that accept edits but do not persist.
- Production-recommended: implicit `Save` on field blur with a 250ms debounce. Each card emits a card-scoped PATCH (`/provider/settings/organisation`, `/provider/settings/notifications`). On success a brief toast `Settings saved` confirms.
- Alternative: a sticky footer with explicit `Save changes` / `Discard` buttons that appears once any field is dirty. Production tenant choice.

## Visual and motion

- Each card is a standard `p-card` with the same gradient border treatment.
- `p-field` lays out label + input vertically with a subtle 8px gap; the label is small / muted text and the input is the standard `p-input`.
- `.p-input` has subtle inner shadow and focus ring `var(--primary)`.
- The card grid is responsive: at narrow widths it collapses to a single column.

## Cross-portal differences (vs admin/settings)

For implementers familiar with the admin module:

| Concern | Admin /settings | Provider /settings |
|---|---|---|
| Title | `Settings` | `Provider settings` |
| Subtitle | `Registry-wide configuration.` | (none) |
| Cards | 4 (Identity / Sovereignty / Audit / Branding) | 2 (Organisation / Notifications) |
| Default count | 12 fields | 6 fields |
| Sensitive defaults | IdP, MFA, retention, archive bucket | (none — provider-org-level only) |
| 4-eyes / second-actor approval | yes for IdP / MFA / retention | no in v0.4 (production may add for `Domain` if it ships as editable) |

## Out of scope on this page

- API key management (lives at `/keys`).
- Team / role management (lives at `/team`).
- Per-resource notification routing (lives on each resource's detail route).
- Branding (logo, primary colour) — provider-org branding is intentionally minimal in v0.4; only `Display name` and `Public bio` surface.
