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

# Public · Ecosystem module — Partners & operators

## Purpose

Specify the **`#/ecosystem` route** of the public marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page presents the ecosystem of independent operators that surrounds the registry — sovereign operators, model providers, hosting & identity, and integration partners. The framing is "an ecosystem, not a platform": the registry catalogues these players but does not own them.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| HTML entry | `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B) |
| Route table | `app.jsx` (`case 'ecosystem': return <EcosystemPage/>`) |
| Page component (`EcosystemPage`, `PageHero`) | `components/pages.jsx` |
| Reveal-on-scroll | `components/primitives.jsx` |
| Section / page-hero / glass card styles | `styles.css` |

## Document title and shell

- HTML `<title>`: `Sovereign AI Registry`
- TopNav active link: `Ecosystem`
- Footer renders below the route body (bundle-dependent).

## Route body — vertical layout (`EcosystemPage`)

1. **PageHero**
2. **Section** — vertical stack of four tier blocks; each block is wrapped in `Reveal` with delay `i * 60` ms.

There is no FilterBar, no tabs, no search on this page.

## Section copy and UI — PageHero (`.page-hero`)

- **Wrapper** has a `grid-bg` overlay (`opacity: 0.6`, `position: absolute, inset: 0, zIndex: 0`).
- **Inner** content (`zIndex: 1`):
  - **Crumbs** (`.crumbs`): `Ecosystem · Partners & Operators`  
    (Note Unicode middle dot U+00B7 separating the two phrases.)
  - **H1** (mixed text + gradient span):
    - Plain: `An ecosystem, `
    - Gradient (`<span class="gradient-text">`): `not a platform`
    - Plain: `.`
  - **Subtitle** (`marginTop: 18, fontSize: 17, maxWidth: 680, color: var(--text-2)`):
    `Five layers of independent operators — registry, providers, hosting, identity and integrators — held together only by open standards and stable identifiers.`

## Section copy and UI — Tier blocks

Four tiers rendered top-to-bottom. Each tier is a vertical block:

1. **Tier header** row (`display: flex, alignItems: baseline, gap: 14, marginBottom: 16`):
   - Eyebrow (`.eyebrow`): `<span class="dot"></span><span>{tier name}</span>`
   - Hairline (`flex: 1, height: 1, background: var(--hairline)`)
2. **Item grid** (`gridTemplateColumns: repeat(auto-fill, minmax(220px, 1fr)), gap: 12`):
   - Each item is a `.glass` card (`padding: 20px 18px, display: flex, alignItems: center, gap: 12`) with:
     - Left: a 28×28 rounded square (`borderRadius: 6, background: var(--grad-accent), opacity: 0.8`) — purely decorative.
     - Right: text `{name}` at `fontSize: 13.5, fontWeight: 500`.

## Mock partners — `EcosystemPage` `partners` array

Four tiers, exact contents:

### Sovereign Operators (5 items)

- Government of Mauritius
- Ministry of Finance
- Mauritius Revenue Authority
- Bank of Mauritius
- EDB Mauritius

### Model Providers (5 items)

- Anthropic
- OpenAI
- Meta · Llama
- Mistral AI
- University of Mauritius (Kreol LLM)

The `Meta · Llama` entry uses Unicode middle dot U+00B7 between `Meta` and `Llama`.

### Hosting & Identity (4 items)

- Sovereign Cloud MU
- Public GPU Co-op
- On-prem operators
- SPIFFE/SPIRE federation

### Integration Partners (4 items)

- Accenture
- Deloitte Sovereign
- Local SI Network
- Independent reviewers

## Visual and motion

- **PageHero**: `grid-bg` is the same animated grid used by the home page Hero, dimmed to 60% opacity.
- **Gradient heading**: the `gradient-text` span uses `background-clip: text` with `var(--grad-text)`. The gradient direction matches the hero (13deg by default).
- **Reveal**: each tier block wraps in `Reveal` with a delay multiplier of 60 ms (`delay = i * 60`), so tier 0 fires at 0ms, tier 1 at 60ms, tier 2 at 120ms, tier 3 at 180ms. IntersectionObserver threshold 0.12; transition 700ms cubic-bezier(.2,.8,.2,1).
- **Glass card hover**: subtle 1px translateY + brightened gradient border (per `.glass:hover` in `styles.css`).
- **Decorative square**: gradient `var(--grad-accent)` at `opacity: 0.8`. Production may swap for a real provider logo if desired; the square keeps the page from depending on logo licensing.

## Navigation behaviour from this page

- TopNav links navigate to other public routes via hash.
- Glass cards are NOT clickable in v0.4. Production may add per-partner detail pages (e.g. `/ecosystem/{slug}`) and wire each card as a link; if so, surface a hover ring and emit a new event `public.ecosystem.partner.clicked` with the partner name and tier.

## Out of scope on this page

- Per-partner detail / drill-down (planned).
- Filter / search (the page is intentionally short — five tiers, ~18 names).
- Logo upload UI (logos are out-of-band; the prototype uses a decorative gradient square).
