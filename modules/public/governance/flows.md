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

# Public · Governance module — Flows

## Routing

- Route lives at `#/governance` of the public site hash router.
- Activated by:
  - TopNav `Governance` link.
  - Footer column links (e.g. Bundle B Footer's "Governance" column header).
- Active match: `route === 'governance'`.

## Initial render

1. App resolves `route === 'governance'` → renders `<GovernancePage/>`.
2. PageHero paints synchronously; `grid-bg` overlay continues animating.
3. The two cards inside `.gov-grid` mount inside `Reveal` wrappers — Card 1 with no delay, Card 2 with `delay={120}` ms.
4. Production: emit `public.governance.viewed` after first paint.

## Card reveal

- **Flow 1 — Card 1 (What it is)** — IntersectionObserver fires when the card enters the viewport (threshold 0.12). Emit `public.governance.card.revealed` with `heading: 'What it is'` and `index: 0`.
- **Flow 2 — Card 2 (What it is not)** — Same, with `delay={120}` ms. Emit `public.governance.card.revealed` with `heading: 'What it is not'` and `index: 1`.

The two cards typically reveal together because the grid layout has them side-by-side at viewport widths ≥720px; below that, the grid stacks and the second card may reveal slightly later as the user scrolls.

## Card interaction

- Cards are **non-interactive** in v0.4. There are no internal links, no buttons, no hover-affordance beyond the standard `.glass:hover` lift.
- The literal `air://` mono span is text-only. Production may convert it to a link to `#/docs#air-id`; if so, surface a small "external" indicator and emit a new `public.governance.air_id_link.clicked` event.

## Auto-refresh

- Prototype: none.
- Production-recommended: cache the inline charter in the SPA bundle. If served from `/public/governance`, cache 24h at the CDN edge. The charter changes rarely (only on ratification of an amendment).

## Error and empty states

- The page is hard-coded — no error state in v0.4.
- If served from `/public/governance` and the GET fails: render the PageHero plus a single inline error card `Couldn't load charter. Try again.`. The TopNav and Footer remain interactive.

## Accessibility

- The PageHero `<h1>` is the page heading.
- Each charter card uses `<h3>` for its heading. Production should mark the bullet lists with `<ul>`/`<li>` (the prototype already does).
- The Unicode "not equal to" sign in `Listing ≠ endorsement` should expose `aria-label="not equal to"` so screen readers don't say "not equal sign".
- Mono inline tokens should be wrapped in `<code>` for screen-reader semantics, NOT just a styled `<span>` (production improvement).

## Cross-portal cross-references

- The four governance signals named in Card 1 bullet 3 (`provider-verified`, `sovereignty-reviewed`, `official-resource`) appear as status pills throughout the public registry and admin / sovereign / verifier portals.
- The "open, append-only audit log" mentioned in Card 1 bullet 4 has its operational surface in the admin portal at `#/audit` (`modules/admin/audit/`).
- The four NOT-bullets correspond to deliberate non-features: there is no runtime, no certification authority, no marketplace, no hosting product. Production roadmap discussions must consult this charter before proposing additions.
