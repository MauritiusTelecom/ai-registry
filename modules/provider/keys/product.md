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

# Provider · API keys module — Keys for publishing and CI

## Purpose

Specify the **`/keys` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page lists every API key the active provider has issued — for publishing, CI pipelines, and read-only seats. It is the only surface where a key is created (full secret shown once) and the only surface where a key can be revoked.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/keys'` → `PROV_PAGES.ProvKeys`) |
| Page component (`ProvKeys`) | `portals/provider-pages.jsx` |
| Mock keys (`PROV_KEYS`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="API keys"`
  - `breadcrumb=["Provider", "Org", "Keys"]`
  - Active sidebar item: `API keys` (`path: "/keys"`).

## Route body — vertical layout (`ProvKeys`)

1. **PageHeader**
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `API keys`
- **Subtitle:** `Keys for publishing and CI.`
- **Actions row:**
  - Primary button only (`Btn variant="primary" icon="plus"`): `Create key`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `name` | `Name` | (auto) | `<span class="p-cell-strong">{name}</span>` |
| `key` | `Key` | (auto) | `<span class="p-mono-val">{prefix}…{last4}</span>` |
| `scope` | `Scope` | (auto) | `<span class="p-mono-key">{scope}</span>` |
| `created` | `Created` | 120 | `<span class="p-mono-key">{created}</span>` |
| `lastUsed` | `Last used` | 120 | `<span class="p-mono-key">{lastUsed}</span>` |

Rows bind to `P.keys` (no filtering, no sorting in v0.4). The table is **non-interactive** (no `onRowClick`).

The `Key` column composes `prefix` + Unicode horizontal ellipsis (U+2026) + `last4`. Production must use the same character; the full secret never appears here (it is shown once at creation in a modal — see `flows.md`).

## Mock keys — `PROV_KEYS`

Reproduce verbatim from `provider-data.jsx`:

| id | name | prefix | last4 | scope | created | lastUsed |
|---|---|---|---|---|---|---|
| k_001 | production | air_pk_live_ | 8821 | publish:read,write | 2026-02-04 | 2m ago |
| k_002 | ci-pipeline | air_pk_live_ | 4471 | publish:write | 2026-03-19 | 14m ago |
| k_003 | staging | air_pk_test_ | 0094 | publish:read,write | 2026-04-02 | 1h ago |

`prefix` carries the environment hint (`air_pk_live_` for production / staging-of-production tenants; `air_pk_test_` for sandbox tenants). The combined display reads like `air_pk_live_…8821`.

## Visual and motion

- Mono key cells use `IBM Plex Mono` for fixed-width alignment.
- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.
- `lastUsed` values like `2m ago`, `14m ago`, `1h ago` are server-formatted relative time strings; production may live-update via a tick every 60s while the page is visible.

## Navigation behaviour

- `Create key` (header primary): no-op stub in prototype. Production opens a modal capturing:
  - **Name** — display label (e.g. `production`, `ci-pipeline`).
  - **Scope** — multi-select over `publish:read`, `publish:write`. Defaults to `publish:read,write` for owner seats; service seats often choose `publish:write` only.
  - **Expires** — optional date (default: never).
- On submit → POST `/provider/keys`. Server returns the **full** key string ONCE; the modal displays it with a `Copy to clipboard` action and a banner `Save this now — you will not see it again.`
- Row click: not bound on this page; planned for production once a per-key detail / rotation / revoke route ships.

## Out of scope on this page

- Per-key detail (planned).
- Per-key rotation (POST `/keys/{id}/rotate`).
- Per-key revoke (POST `/keys/{id}/revoke`).
- Audit log of key uses (lives on the key detail route).

## Critical security invariants (UI-level)

- The full secret string MUST NEVER appear on this list page or in any list response.
- The truncated form `prefix…last4` is the only safe representation.
- The clipboard copy at creation MUST NOT log the secret to telemetry — only fire `provider.keys.key.created` with the key's `id`.
