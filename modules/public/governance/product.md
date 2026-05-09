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

# Public · Governance module — Charter & review

## Purpose

Specify the **`#/governance` route** of the public marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This page presents the registry's governance posture under a single declaration: governance without overreach. It contrasts what the registry IS versus what it IS NOT, and it grounds the public's expectations of the operator.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| HTML entry | `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B) |
| Route table | `app.jsx` (`case 'governance': return <GovernancePage/>`) |
| Page component (`GovernancePage`, `PageHero`) | `components/pages.jsx` |
| Reveal-on-scroll | `components/primitives.jsx` |
| Section / page-hero / glass card / governance grid styles | `styles.css` |

## Document title and shell

- HTML `<title>`: `Sovereign AI Registry`
- TopNav active link: `Governance`
- Footer renders below the route body (bundle-dependent).

## Route body — vertical layout (`GovernancePage`)

1. **PageHero**
2. **Section** — a 2-column `gov-grid` of two large `.glass` cards: **What it is** + **What it is not**.

There is no FilterBar, no tabs on this page. The home-page `GovernanceSection` (with its four pillars and Sovereignty Test panel) is a different surface — see `modules/public/home/`. This standalone `/governance` route is the **charter** view.

## Section copy and UI — PageHero (`.page-hero`)

- **Wrapper** has a `grid-bg` overlay (`opacity: 0.6, position: absolute, inset: 0, zIndex: 0`).
- **Inner** content (`zIndex: 1`):
  - **Crumbs** (`.crumbs`): `Governance · Charter & Review`  
    (Unicode middle dot U+00B7 separating the phrases.)
  - **H1** (mixed text + gradient span):
    - Plain: `Governance `
    - Gradient (`<span class="gradient-text">`): `without overreach`
    - Plain: `.`
  - **Subtitle** (`marginTop: 18, fontSize: 17, maxWidth: 680, color: var(--text-2)`):
    `The discipline of the registry is in what it refuses to do. Many adjacent capabilities are reasonable; each one would make the registry a different kind of platform.`

## Section copy and UI — Charter cards

The two cards live inside `<section class="section"><div class="gov-grid" style="gap: 32">` and each wraps in a `Reveal`:

### Card 1 — What it is (no Reveal delay)

- Wrapper: `<div class="glass" style="padding: 28">`
- H3: `What it is`
- `<ul style="marginTop: 14, paddingLeft: 18, color: var(--text-2), fontSize: 14, lineHeight: 1.65">` with four list items:
  1. `A locally-governed catalogue of sovereign AI resources.`
  2. `Stable identifiers under <span class="mono" style="color: var(--text)">air://</span>.`  
     (The literal `air://` is rendered in mono with `var(--text)` colour for emphasis.)
  3. `Three independent governance signals: provider-verified, sovereignty-reviewed, official-resource.`
  4. `An open, append-only audit log.`

### Card 2 — What it is not (`Reveal delay={120}`)

- Wrapper: `<div class="glass" style="padding: 28">`
- H3: `What it is not`
- `<ul>` (same style as Card 1) with four list items:
  1. `A runtime, gateway or proxy.`
  2. `A certification authority. (Listing ≠ endorsement.)`  
     (Unicode "not equal to" U+2260 between `Listing` and `endorsement`.)
  3. `A marketplace or payment layer.`
  4. `A hosting provider for any AI resource.`

## Visual and motion

- **PageHero**: `grid-bg` is the same animated grid used by the home page Hero, dimmed to 60% opacity.
- **Gradient heading**: the `gradient-text` span uses `background-clip: text` with `var(--grad-text)`.
- **Reveal**: the first card has no delay; the second card has `delay={120}` ms. IntersectionObserver threshold 0.12; transition 700ms cubic-bezier(.2,.8,.2,1).
- **Glass cards**: standard `.glass` with `padding: 28`. Hover lift via `.glass:hover`.
- **List style**: native bullets, padded left 18; muted text colour, 14px, line-height 1.65.
- **Mono inline tokens** (`air://`): `IBM Plex Mono`, `var(--text)` (primary text colour, NOT muted) — visually emphasised against the surrounding muted body text.
- **`gov-grid`**: 2-column responsive grid; collapses to single column below ~720px.

## Navigation behaviour from this page

- TopNav links navigate to other public routes via hash.
- The cards are **non-interactive** in v0.4. There are no internal links inside the card bodies.
- The literal `air://` mono span is text only — production may convert it to a link to the AIR-ID specification on the docs page (`#/docs#air-id`).

## Out of scope on this page

- The four governance pillars (Provider Verification, Sovereignty Review, Runtime Identity, Open Audit Log) — those live on the home page's `GovernanceSection`, NOT on this charter route.
- The Sovereignty Test panel — also home-page-only.
- Per-resource governance metadata — that's the `/registry` card's status pill plus the planned per-resource detail page.
- Audit log content — the prototype doesn't include public audit access; production may surface a read-only public ledger view at `#/governance/audit`.

## Difference vs the home-page `GovernanceSection`

For implementers familiar with the home-page version:

| Concern | Home (`#/home`) `GovernanceSection` | Standalone `/governance` |
|---|---|---|
| Wrapper | `<section>` mid-page | `PageHero` + `<section>` |
| Eyebrow / heading | "Governance, not Gatekeeping" / "Listing is not endorsement…" | "Governance · Charter & Review" / "Governance without overreach." |
| Body | 4 pillars + Sovereignty Test panel | 2 cards: What it is / What it is not |
| Tone | Operational (what each pillar does) | Constitutional (what the registry refuses to do) |

Both pages are valid governance surfaces — they answer different questions.
