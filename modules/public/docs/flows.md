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

# Public · Documentation module — Flows

## Routing

- Route lives at `#/docs` of the public site hash router.
- Activated by:
  - TopNav `Documentation` link.
  - Footer column links (e.g. Bundle B Footer's "Resources" column).
  - Cross-portal references from `Read AIR-SPEC 0.4` CTAs (Bundle B Promo).
- Active match: `route === 'docs'`.

## Initial render

1. App resolves `route === 'docs'` → renders `<DocsPage/>`.
2. PageHero paints synchronously.
3. The 2-column section mounts; the sticky-nav left column renders inside `Reveal` (no delay).
4. The right column iterates over the `sections` array and renders each block inside `Reveal` with `delay = i * 50` ms.
5. Production: emit `public.docs.viewed` after first paint with `sectionCount: 5`.

## Sticky nav flow

### Flow 1 — Anchor click

- Click a sticky-nav link (`<a href="#${id}">`).
- **Critical**: clicking the bare `href="#${id}"` will set `window.location.hash = '#${id}'`, which the public-site hash router parses as a missing route and falls back to `home` (since `'overview'` is not one of the routes `home/registry/ecosystem/governance/docs/contact`). This breaks the page.
- **Production must intercept the click**:
  ```js
  onClick={(e) => {
    e.preventDefault();
    document.getElementById(id).scrollIntoView({behavior:'smooth', block:'start'});
    history.replaceState(null, '', `#/docs#${id}`);  // optional URL update
  }}
  ```
- Smooth scroll to the target section (`element.scrollIntoView({behavior:'smooth', block:'start'})`).
- Optionally update the URL hash to `#/docs#${id}` so deep links survive.
- Emit `public.docs.nav_link.clicked` with `id`.

### Flow 2 — Scrollspy (production)

- v0.4 has no scrollspy.
- Production: as the user scrolls, observe each section block via IntersectionObserver. The most-visible section's nav link gains a `.active` class. Update the URL hash silently via `history.replaceState`.

## Section reveal

### Flow 3 — Per-section animation

- Each section block reveals when its IntersectionObserver fires (threshold 0.12).
- The 50ms stagger means sections that come into view simultaneously animate in sequence.
- Emit `public.docs.section.revealed` per section.

## Code block flow

### Flow 4 — Copy code (production)

- v0.4 code blocks have no `Copy` button.
- Production: each `<pre>` block gets a `Copy` button in the top-right corner. Click → `navigator.clipboard.writeText(codeText)` → small toast `Copied`.
- Emit `public.docs.code.copied` with `sectionId`.

## Auto-refresh

- Prototype: none.
- Production-recommended: cache the spec in the SPA bundle. If served from `/public/docs/spec`, cache 24h at the CDN edge.

## Error and empty states

- The page is hard-coded — no error state in v0.4.
- If served from `/public/docs/spec` and the GET fails: render the PageHero plus an inline error block. Sticky nav can still render with the known section ids (production should keep the ids canonical even when bodies fail).

## Accessibility

- The PageHero `<h1>` is the page heading.
- Each section uses `<h3>`. Production should consider `<h2>` for the section H3s so screen readers see a clean H1 → H2 → (in-section) H3 hierarchy.
- The eyebrow text `§ NN {label}` is informational; production should mark it `aria-hidden="true"` and rely on the H3 below for semantics.
- The Unicode section sign `§` should expose `aria-label="section"` for screen readers (optional but improves clarity).
- Code blocks (`<pre>`) should be wrapped in `<figure role="region" aria-label="code example for {label}">` (production improvement).
- Sticky nav: production must provide a "Skip to content" link that bypasses the sticky nav for keyboard users.

## Cross-portal cross-references

- The provider `Publish` wizard at `modules/provider/publish` enforces the listing schema documented in § 03.
- The provider verification proofs documented in § 04 are the same DNS TXT / signed manifest / HTTPS callback methods used in the publish flow's verification step.
- The review workflow documented in § 05 surfaces in `modules/admin/reviews` and the verifier portal's queue.
- The `air://` identifier format documented in § 02 is the canonical id used across the public registry, every portal, and the audit ledger.
