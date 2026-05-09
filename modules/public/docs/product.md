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

# Public · Documentation module — AIR-SPEC 0.4 MVP

## Purpose

Specify the **`#/docs` route** of the public marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page is the technical spec landing for AIR-SPEC 0.4 MVP — the listing schema, sovereignty rubric, identifier format, and verification proofs the registry implements at `airegistry.mu`.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| HTML entry | `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B) |
| Route table | `app.jsx` (`case 'docs': return <DocsPage/>`) |
| Page component (`DocsPage`, `PageHero`) | `components/pages.jsx` |
| Reveal-on-scroll | `components/primitives.jsx` |
| Section / page-hero / sticky nav / code block styles | `styles.css` |

## Document title and shell

- HTML `<title>`: `Sovereign AI Registry`
- TopNav active link: `Documentation`
- Footer renders below the route body (bundle-dependent).

## Route body — vertical layout (`DocsPage`)

1. **PageHero**
2. **Section** — 2-column layout (`gridTemplateColumns: '220px 1fr', gap: 48`), `paddingTop: 40`:
   - Left column: sticky-top in-page nav (mono, 12px), scrolls anchors.
   - Right column: vertical stack of five `Reveal`-wrapped section blocks.

There is no FilterBar, no tabs, no search on this page.

## Section copy and UI — PageHero (`.page-hero`)

- **Wrapper** has the standard `grid-bg` overlay (`opacity: 0.6, position: absolute, inset: 0, zIndex: 0`).
- **Inner** content (`zIndex: 1`):
  - **Crumbs** (`.crumbs`): `Documentation · AIR-SPEC 0.4 MVP`  
    (Unicode middle dot U+00B7.)
  - **H1** (mixed text + gradient span):
    - Plain: `The technical `
    - Gradient (`<span class="gradient-text">`): `specification`
    - Plain: `.`
  - **Subtitle** (`marginTop: 18, fontSize: 17, maxWidth: 680, color: var(--text-2)`):
    `Everything you need to publish, resolve and audit listings against the v0.4 reference implementation at airegistry.mu.`

## Section copy and UI — Sticky nav (left column, 220px wide)

Wrapped in `Reveal`. Inline style: `position: sticky, top: 100, display: flex, flexDirection: column, gap: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12`.

Five anchor links, in order:

| anchor id | label |
|---|---|
| `overview` | `Overview` |
| `air-id` | `AIR-ID format` |
| `metadata` | `Listing metadata` |
| `verification` | `Provider verification` |
| `review` | `Review workflow` |

Each link is an `<a href="#${id}">` with inline style `padding: 6px 10px, borderRadius: 6, color: var(--text-2)`. Active-link highlighting is NOT implemented in v0.4 — production should add a scrollspy that toggles a `.active` class as the user scrolls past each section.

## Section copy and UI — Doc sections (right column)

Five sections rendered in order. Each section is wrapped in `Reveal` with `delay = i * 50` ms (so 0, 50, 100, 150, 200 ms).

Each section block (`<div id="{id}">`):

1. **Eyebrow** (`.eyebrow`): `<span class="dot"></span><span>§ {NN} {label}</span>`  
   Where `NN` is the section number padded to 2 digits (`01`, `02`, …, `05`). The `§` is Unicode section sign U+00A7.
2. **H3** (`marginTop: 12`): `{label}` (same as the eyebrow label, but without the `§ NN` prefix).
3. **Body paragraph** (`marginTop: 8, fontSize: 15, lineHeight: 1.65`): `{body}`.
4. **Code example** (`<pre>` with `marginTop: 14, padding: 16, background: var(--code-bg), border: 1px solid var(--border), borderRadius: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: var(--text-2), overflow: auto`):
   ```
   # example
   GET /.well-known/air-spec/{id}
   → 200 OK  application/yaml
   ```
   Where `{id}` is the section's anchor id.

## Mock sections — `DocsPage` `sections` array

Reproduce verbatim from `components/pages.jsx`. The five v0.4 sections are:

### § 01 Overview

`AIR-SPEC 0.4 defines the listing schema, sovereignty rubric, identifier format, and verification proofs the registry implements.`

### § 02 AIR-ID format

`air://<jurisdiction>/<kind>/<provider>/<name>@<version> — stable, resolvable, and human-readable.`

(Note Unicode em dash U+2014.)

### § 03 Listing metadata

`Provider, kind, sovereignty bases with evidence, contact, terms, license, region, optional SPIFFE trust domain.`

### § 04 Provider verification

`DNS TXT and email-based proofs. Any mismatch flips status to "unverified" and surfaces a public note.`

(Note Unicode left/right curly quotes U+201C/U+201D around `unverified`.)

### § 05 Review workflow

`Reviewers apply the published checklist, record signed notes, and assign a status. Appeals are public.`

## Visual and motion

- **PageHero**: same `grid-bg` overlay treatment as the Ecosystem and Governance routes.
- **Sticky nav**: `position: sticky` with `top: 100` keeps it pinned 100px below the viewport top while scrolling. Production must add scrollspy.
- **Code blocks** (`<pre>`): rounded corners (10px), 1px border, mono font, slight muted text colour. The `var(--code-bg)` is darker than the surrounding card surface to make it look like terminal output.
- **Reveal**: each section block enters with the standard `Reveal` animation; staggered 50ms.
- **Anchor scroll**: clicking a sticky nav link MUST smooth-scroll to the target section; production should call `element.scrollIntoView({behavior: 'smooth', block: 'start'})` and update the URL hash.

## Navigation behaviour from this page

- TopNav links navigate to other public routes via hash (the standard hash router).
- Sticky nav links scroll to in-page anchors (`#overview`, `#air-id`, etc.). Note this conflicts with the hash router — the router treats `#overview` as a missing route and falls back to `home` if React intercepts it.  
  **Production must intercept the sticky nav anchor clicks** (`onClick={(e) => { e.preventDefault(); document.getElementById(id).scrollIntoView({behavior:'smooth'}); }}`) so the hash router doesn't navigate away from `/docs`.
- Code block content is selectable — production should add a `Copy` button per code block.

## Out of scope on this page

- Live API explorer / playground (planned).
- Per-section deep links to authenticated portals (e.g. `Try this in the admin portal` — out of scope for the public spec page).
- Localised docs (the spec is English-only in v0.4).
- Versioned spec selector (only AIR-SPEC 0.4 in v0.4; production may add a `v0.4 | v0.5 …` switcher in the sticky nav header).

## Cross-portal cross-reference

- Provider-side, the `Publish` wizard at `modules/provider/publish` enforces the listing schema documented in § 03 and the verification proofs documented in § 04.
- Admin-side, the review workflow documented in § 05 surfaces in `modules/admin/reviews`.
- The `air://` identifier format documented in § 02 is the canonical id used across the public registry, every portal, and the audit ledger.
