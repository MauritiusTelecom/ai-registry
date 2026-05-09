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

# Public · Ecosystem module — Flows

## Routing

- Route lives at `#/ecosystem` of the public site hash router.
- Activated by:
  - TopNav `Ecosystem` link.
  - Hero `Explore Ecosystem` secondary CTA on `#/home`.
- Active match: `route === 'ecosystem'`.

## Initial render

1. App resolves `route === 'ecosystem'` → renders `<EcosystemPage/>`.
2. `EcosystemPage` declares the `partners` array inline (4 tiers; v0.4 hard-coded).
3. PageHero paints synchronously; `grid-bg` overlay continues animating.
4. Each tier block mounts wrapped in `Reveal` with `delay = i * 60` ms; IntersectionObserver fires when the block enters the viewport (threshold 0.12).
5. Production: emit `public.ecosystem.viewed` with `tierCount` and `partnerCount` after first paint.

## Tier reveal

- Each tier block animates in independently. The grid items inside don't have their own Reveal — they appear when the parent reveals.
- Production: emit `public.ecosystem.tier.revealed` per tier when its IntersectionObserver fires.

## Card interaction (production)

- v0.4 cards are non-interactive. There is no hover affordance beyond the standard `.glass:hover` lift.
- Production-recommended: convert each `.glass` card to an `<a>` with `href="/ecosystem/{slug}"` once per-partner detail pages exist. On click → `navigate('ecosystem/' + slug)` (or full URL navigation if the detail page is server-rendered).
- Emit `public.ecosystem.partner.clicked` with the partner name and tier.

## Auto-refresh

- Prototype: none.
- Production-recommended: cache `GET /public/ecosystem` for 1 hour at the CDN edge; on page load, the SPA reads from the cache. Refetch on `visibilitychange` after the cache TTL.

## Error and empty states

- **GET fails**: render the PageHero, then a single full-width inline error block in the section: `Couldn't load partner ecosystem.` plus a `Retry` button.
- **No tiers in the response (zero ecosystem)**: unlikely in production. If it happens, render the PageHero plus a single line `Partner ecosystem is being curated.`
- **Tier with empty `items`**: render the tier header (eyebrow + hairline) but no grid items below. This is intentional — it signals the tier exists structurally even if no partners are listed yet.

## Accessibility

- The PageHero `<h1>` is the page heading. Tier eyebrows should NOT use `<h2>` — they are visual labels, not heading-level structure. Production should mark them with `role="heading" aria-level="2"` if the tier names should appear in the document outline.
- Each glass card with a name renders the name in plain text. If converted to `<a>` (production), the link text is the partner name — accessible by default.
- The decorative gradient square is not informational; production must add `aria-hidden="true"`.
- `Reveal` opacity transitions respect `prefers-reduced-motion`; users with reduced motion see the content immediately.

## Cross-portal cross-references

- Sovereign-side admins maintain the partner roster via the planned `Settings → Ecosystem` admin surface (out of scope here).
- A partner that publishes resources appears here AND in the public `/registry` (as the row's `provider` field).
