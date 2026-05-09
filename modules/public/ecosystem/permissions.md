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

# Public · Ecosystem module — Permissions and access

## Surface classification

The public `/ecosystem` route is **unauthenticated public content**. Every partner name listed here is intentionally surfaceable to anonymous visitors and search engines.

## Authentication binding

There is **no required authentication** to view this route. The TopNav `Log In` CTA is shell-owned and never gates the page body.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| PageHero (crumbs / title / subtitle) | none | Public copy. |
| Tier eyebrow + hairline | none | Visual section labels. |
| Glass card body | none | Public partner display name. |
| Decorative gradient square | none | Cosmetic; not interactive. |
| Card click (production) | none | Navigates to a public partner detail page. |

## Anonymous-visitor data handling

- The page renders the same static payload to every visitor; there is no per-visitor variation.
- Telemetry events are anonymous and MUST NOT include any free-form input (the page has none).
- The decorative gradient square does NOT call out to logo CDNs; partner logos in production come from the partner-detail endpoint, not the list.

## Content moderation

- The partner list is **operator-curated** — never user-generated. Production must NOT accept partner self-additions on this surface; new partners are added via the planned admin `Settings → Ecosystem` flow.
- Removing a partner removes it from this list immediately on next CDN cache miss; previously-served pages may continue to show the partner until cache expires (1 hour).

## Audit obligations

- Reading the public ecosystem writes nothing to the audit ledger.
- Adding / removing / reordering partners (admin-side, out of scope here) writes `ecosystem.partner.added` / `ecosystem.partner.removed` / `ecosystem.partner.reordered` to the immutable audit ledger.

## Negative cases

- **Empty tier**: render the tier header with no items.
- **Server unreachable**: render the PageHero plus an inline error block (see flows.md).
- **JavaScript disabled**: production must serve a static fallback HTML listing the four tiers and their items as plain `<ul>` lists. The animation is purely cosmetic.

## Data residency

- The partner list is identical in every region; the ecosystem is not regionalised in v0.4.
- Production may add region-specific partner subsets later (e.g. `EcosystemTier.regions: string[]`); if added, the SPA must filter client-side based on a tenant policy, not on viewer geo.
- Production must NOT auto-translate partner names (e.g. `Government of Mauritius` should remain in English in all locales by default; explicit per-locale labels can be added via a future `EcosystemTier.itemsLocalised` field).
