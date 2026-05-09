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

# Admin · Audit module — Audit log

## Purpose

Specify the **`/audit` route** of the Admin portal so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page is the operator-facing window into the immutable, content-addressed audit ledger. Every state-changing action across the registry surfaces here.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| Portal entry HTML | `portals/admin.html` |
| Route table | `portals/admin-app.jsx` (`'/audit'` → `ADMIN_PAGES.AdminAudit`) |
| Page component (`AdminAudit`) | `portals/admin-pages.jsx` |
| Mock audit (`ADMIN_AUDIT`) | `portals/admin-data.jsx` |
| Shared shell (`PageHeader`, `DataTable`, `StatusPill`, `Btn`, `PIcon`) | `portal-shell.jsx` |
| Portal design tokens | `portal-styles.css` |

## Document title and shell

- HTML `<title>`: `AI Registry · Admin`
- `PortalShell` overrides:
  - `currentTitle="Audit log"`
  - `breadcrumb=["Admin", "Operations", "Audit"]`
  - Active sidebar item: `Audit log` (`path: "/audit"`).

## Route body — vertical layout (`AdminAudit`)

1. **PageHeader**
2. **DataTable** — full width

There are **no StatCards** and **no FilterBar** on this page in v0.4.

## Section copy and UI — PageHeader

- **Title:** `Audit log`
- **Subtitle:** `Append-only, content-addressed. Each block signed and notarised.`
- **Actions row (two secondaries, no primary):**
  - `Btn variant="secondary" icon="arrow-up-right"`: `Export`
  - `Btn variant="secondary" icon="audit"`: `Verify integrity`

## Section copy and UI — DataTable

| Key | Label | Width | Cell |
|-----|-------|------:|------|
| `id` | `ID` | 110 | `<span class="p-mono-val">{id}</span>` |
| `ts` | `Time` | 160 | `<span class="p-mono-key">{ts}</span>` |
| `actor` | `Actor` | (auto) | `<span class="p-cell-strong">{actor}</span>` |
| `action` | `Action` | (auto) | `<span class="p-mono-val">{action}</span>` |
| `target` | `Target` | (auto) | `<span class="p-mono-val">{target}</span>` |
| `result` | `Result` | 110 | `<StatusPill status={r.result === 'ok' ? 'verified' : 'failed'}/>` |
| `sig` | `Signature` | 100 | `<span class="p-mono-key">{sig}</span>` |

Rows bind to `A.audit` (no filtering, no sorting in v0.4). The table is **non-interactive** in the prototype (no `onRowClick` passed).

## Mock audit ledger — `ADMIN_AUDIT`

Reproduce verbatim from `admin-data.jsx`. The 10 v0.4 rows span resource/policy/user/system actions:

| id | ts | actor | action | target | result | sig |
|---|---|---|---|---|---|---|
| a_4421 | 2026-05-07 09:42 | john@gov.mu | resource.verify | mcp/edu-curriculum | ok | a14b…7e |
| a_4420 | 2026-05-07 09:21 | sanjay@review.mu | resource.review.approve | agent/sugarcane-yield | ok | 92c1…3d |
| a_4419 | 2026-05-07 08:54 | marie@finance.gov.mu | policy.update | pol_egress_default | ok | d770…11 |
| a_4418 | 2026-05-07 08:31 | system | health.probe | mcp/health-records | fail | 60a3…cc |
| a_4417 | 2026-05-07 07:12 | aisha@anthropic.com | resource.publish | model/anthropic-sonnet-7 | ok | b4ee…42 |
| a_4416 | 2026-05-07 06:55 | john@gov.mu | user.invite | beegun@health.gov.mu | ok | 01f9…87 |
| a_4415 | 2026-05-06 18:44 | sanjay@review.mu | resource.review.reject | model/openai-gpt-6 | ok | aa7d…0e |
| a_4414 | 2026-05-06 18:00 | system | audit.notarize | block_8821 | ok | cc4b…91 |
| a_4413 | 2026-05-06 16:22 | john@gov.mu | flag.create | mcp/health-records | ok | 2210…ab |
| a_4412 | 2026-05-06 14:11 | marie@finance.gov.mu | sov.classify | mcp/customs-tariff | ok | fe55…73 |

The dashboard's `Recent activity` card binds to `audit.slice(0, 6)` — the same rows in the same order.

## Visual and motion

- StatusPill colours per global token map (`verified` → green, `failed` → red).
- Rows do not show hover affordance because click is not bound; production must keep the cursor default until row click ships.
- The signature cell shows a truncated hash (e.g. `a14b…7e`); production must use the same Unicode horizontal ellipsis `…` (U+2026), NOT three dots `...`.

## Navigation behaviour

- `Export` (header secondary): no-op stub in prototype. Production triggers `GET /admin/audit/export.csv` (or `.jsonl` per content negotiation) over the current filter state and downloads the result.
- `Verify integrity` (header secondary): no-op stub in prototype. Production starts an integrity verification job (POST `/admin/audit/verify`); a toast displays the job id and final result. Spec details below.
- Row click: not bound on this page; planned for production once an audit record detail / signature inspector ships.

## Verify integrity — flow contract (production)

When triggered:

1. Server returns `202 Accepted` with `{ jobId, since, until }` representing the range covered.
2. Server walks each block in range, recomputes the Merkle leaf hash, verifies the signature against the notary's pinned public key, and matches the recomputed root against the externally-notarised root.
3. Toast updates: `Verifying integrity…` → `Integrity verified through block_<id>` (success) or `Mismatch at block_<id>` (failure, opens an incident).

The prototype does NOT implement this flow; the spec is normative for production.

## Out of scope on this page

- Per-block detail view (planned).
- Signature inspector (will surface full hash, signing key fingerprint, and notary chain).
- Cross-tenant audit federation (out of scope for v0.4).
