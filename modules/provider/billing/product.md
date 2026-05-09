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

# Provider · Billing module — Usage statements

## Purpose

Specify the **`/billing` route** of the Provider portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

For sovereign-tier providers, this page is informational only — usage is reported for transparency at zero cost. For non-sovereign tiers (production-only), it lists invoices and amounts owed.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/provider.html` |
| Route table | `portals/provider-app.jsx` (`'/billing'` → `PROV_PAGES.ProvBilling`) |
| Page component (`ProvBilling`) | `portals/provider-pages.jsx` |
| Mock billing rows (`PROV_BILLING`) | `portals/provider-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Provider`
- `PortalShell` overrides:
  - `currentTitle="Billing"`
  - `breadcrumb=["Provider", "Org", "Billing"]`
  - Active sidebar item: `Billing` (`path: "/billing"`).

## Route body — vertical layout (`ProvBilling`)

1. **PageHeader** (no actions row)
2. **DataTable** — full-width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Billing`
- **Subtitle:** `Sovereign-tier providers operate at zero cost; usage is reported for transparency.`
- **Actions row:** none.

For non-sovereign-tier providers (production), the subtitle and a header action `Download invoice (PDF)` are normative; v0.4 surfaces only the sovereign-tier framing.

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `period` | `Period` | (auto) | `<span class="p-cell-strong">{period}</span>` |
| `usage` | `Usage` | (auto) | `<span class="p-mono-val">{usage}</span>` |
| `tier` | `Tier` | 130 | `<span class="p-tag">{tier}</span>` |
| `amount` | `Amount` | 130 | `<span class="p-mono-val">{amount}</span>` |
| `status` | `Status` | 130 | `<StatusPill status="verified"/>` (always — see status mapping below) |

Rows bind to `P.billing` (no filtering, no sorting in v0.4). The table is **non-interactive** (no `onRowClick`).

## Status mapping (billing status → StatusPill)

The intrinsic `status` field in the prototype carries values like `covered`, but the StatusPill is **hard-coded to `verified`** for every row in v0.4 — the prototype does not branch on status. Production should map:

| Billing `status` | StatusPill visual |
|---|---|
| `covered` | `verified` |
| `paid` | `verified` |
| `due` | `pending` |
| `overdue` | `failed` |
| `disputed` | `review` |

Persisted enum is the canonical value.

## Mock billing — `PROV_BILLING`

Reproduce verbatim from `provider-data.jsx`. All three rows are sovereign-tier zero-cost statements:

| period | usage | tier | amount | status |
|---|---|---|---|---|
| Apr 2026 | 94.2k calls | Sovereign | MUR 0 | covered |
| Mar 2026 | 88.1k calls | Sovereign | MUR 0 | covered |
| Feb 2026 | 79.4k calls | Sovereign | MUR 0 | covered |

`MUR` is the ISO-4217 code for the Mauritian rupee. Production must use the tenant's local currency.

## Visual and motion

- Table rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.
- The amount cell renders verbatim including currency code; production must keep the currency-code prefix (`MUR 0`) so localisation is unambiguous.
- The literal `Sovereign` tier tag uses uniform `p-tag` colour. Production may colour-code by tier if non-sovereign tiers ship.

## Navigation behaviour

- Row click: not bound on this page; planned for production once a per-period statement / invoice route ships.
- No header actions in v0.4. Production adds `Download invoice (PDF)` for non-sovereign tiers; the PDF endpoint signs and dates the file with the tenant's branding (driven by `Settings → Branding`).

## Out of scope on this page

- Statement detail (planned).
- Payment method management (planned for non-sovereign tiers).
- Tax invoice export (jurisdiction-specific).
- Cost projections (could land as a StatCard row in a future revision).
