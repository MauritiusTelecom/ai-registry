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

# Public · Registry module — Permissions and access

## Surface classification

The public `/registry` route is **unauthenticated public content**. Every visible row is intentionally surfaceable to anonymous visitors and search engines. The registry's transparency principle requires that even isolated resources appear here so that the act of isolation is itself public.

## Authentication binding

There is **no required authentication** to view this route. The TopNav `Log In` CTA is present (shell-owned) but never gates the page body.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| Section header (eyebrow / H2 / lead) | none | Public copy. |
| Search input | none | Local filter only; submitted nowhere. |
| Kind tabs | none | Local filter; emits telemetry. |
| Status chips | none | Local filter; emits telemetry. |
| Clear filters chip | none | Local UI reset. |
| Registry card body | none | Public catalog content. |
| Card `View` action | none | Navigates to a public detail page (production). |
| Card `AIR-ID` action | none | Copies a public identifier to clipboard. |
| Card `Report` action | none | Opens the global ReportModal; submission requires an `email`. |

## Anonymous-visitor data handling

- Search queries are local to the browser; production should NOT send queries to the server (do client-side filtering of the cached catalog page).
- Telemetry events MAY include the anonymous visitor id and `queryLength` BUT MUST NOT include the raw query text or any free-form input.
- Card `AIR-ID` clipboard action does NOT round-trip to the server.

## Content moderation

- The public catalog includes ALL listable rows, including `status === 'isolated'`. This is intentional — isolation is part of the registry's public record.
- Drafts (`status === 'draft'` from a provider workspace) MUST NOT appear publicly. Only `verified / trusted / active / experimental / isolated` are surfaceable.
- The card body content is operator-curated (provider-supplied + sovereignty-reviewed). The public site MUST NOT render any user-generated content from card hover / click; if a future revision adds user reviews, that surface needs its own moderation pipeline.

## Audit obligations

- Reading the public registry writes nothing to the audit ledger.
- The card `Report` action's submission writes `report.create` to the immutable audit ledger (server-side; not visible publicly). See `modules/public/home/permissions.md` for the cross-cut.

## Negative cases

- **Empty filter result**: render the empty-state message; no error.
- **GET fails (5xx)**: render the toolbar but replace the grid with an inline error block (see flows.md). Retry button shown.
- **Catalog includes a malformed row**: skip that row in the renderer with a console warning (production); never crash the page.
- **JavaScript disabled**: production must serve a static fallback listing the verified rows in a simple HTML table; the toolbar / chips degrade to a notice `Enable JavaScript to filter the registry.`

## Data residency

- The public CDN serves the same `/public/registry` payload globally with regional cache invalidation. The catalog is intentionally non-tenanted from the visitor's perspective.
- Per-row geographic information (`region` field) is purely descriptive; production must NOT alter the row's visibility based on the viewer's geo without an explicit tenant policy.
- Sanctions / restricted resources (e.g. `tool-sanctions` in v0.4 with `status: 'isolated'`) remain visible because their listing is part of the transparency record. Their actual functionality / endpoints are NOT surfaced here.
