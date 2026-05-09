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

# Public · Home module — Full landing page

## Purpose

Specify the **default public route** (`#/home` or empty hash) of the marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

The home route is a single, long landing page composed of eight sections rendered top-to-bottom. It is the canonical first impression of the Sovereign AI Registry.

## Source of truth (prototype)

Implementation must follow these files under `airegistry-prototype/claudedesign/`:

| Concern | Files |
|---------|-------|
| HTML entry (default bundle) | `index.html` |
| HTML entry (alternate bundle) | `Sovereign AI Registry.html` |
| App shell, route switch, tweak defaults | `app.jsx` |
| Global tokens, hero, metrics, registry, governance, orchestration, promo, FAQ, footer styles | `styles.css` |
| Theme, hash router, auth mock, Reveal, icons, count-up | `components/primitives.jsx` |
| Sticky top nav, theme toggle, user menu | `components/nav.jsx` |
| Hero + floating cards + globe stage | `components/hero.jsx`, `components/globe.jsx` |
| Animated metrics strip | `components/metrics.jsx` |
| Registry browse UI + mock catalog | `components/registry.jsx` |
| Governance pillars + sovereignty test panel | `components/governance.jsx` |
| Orchestration spine (bundle A) | `components/orchestration.jsx` |
| Promo banner / FAQ / Footer (bundle A) | `components/promo-faq-footer.jsx` |
| Sections.jsx alternate (bundle B) | `components/sections.jsx` |
| Report listing modal | `components/modal.jsx` |
| Tweaks panel | `tweaks-panel.jsx` |

This module also references the deeper, more exhaustive spec already at `modules/landing/`. Where this module and `modules/landing/` disagree, **`modules/landing/` is the canonical source** for the home route. This `public/home/` module exists to fit the public-portal naming scheme (`public/{home, registry, ecosystem, governance, docs, contact}`) and to point implementers to the right cross-references.

## Document title and fonts

- HTML `<title>`: `Sovereign AI Registry`
- **Bundle A (`index.html`)**: Google Fonts link includes Inter + IBM Plex Sans + IBM Plex Mono.
- **Bundle B (`home-spa.html` / `Sovereign AI Registry.html`)**: IBM Plex Sans + IBM Plex Mono only.
- Body font stack in CSS: `'IBM Plex Sans', 'Inter', system-ui, sans-serif`.

## Shell (rendered around the home route AND every other public route)

`app.jsx` mounts:

1. **TopNav** (`components/nav.jsx`) — sticky top nav with logo + 6 link items + theme toggle + Log In CTA + mobile menu.
2. **Route body** — for `home`/empty hash, the eight sections listed below.
3. **Footer** — depends on bundle (A vs B; see `modules/landing/product.md` for the exact strings).
4. **ReportModal** — global; opens when a registry card's `Report` action fires.
5. **TweaksPanel** — design-time only; default tweak object in `app.jsx`:

```json
{
  "accentPalette": 0,
  "motionIntensity": 1,
  "density": "balanced",
  "heroVariant": "globe"
}
```

## Top nav (`components/nav.jsx`)

Logo: a small mark + the text `Sovereign Registry`.

Link order (route ids in parens):
1. `Home` (`home`)
2. `Registry` (`registry`)
3. `Ecosystem` (`ecosystem`)
4. `Governance` (`governance`)
5. `Documentation` (`docs`)
6. `Contact` (`contact`)

Right slot: theme toggle, `Log In` primary-styled CTA, mobile-menu hamburger.

## Home route — vertical order (`HomePage` in `app.jsx`)

1. **Hero** — `components/hero.jsx`
2. **MetricsBar** — `components/metrics.jsx`
3. **RegistrySection** — `components/registry.jsx`
4. **GovernanceSection** — `components/governance.jsx`
5. **Orchestration** — bundle A: `OrchestrationSection` from `orchestration.jsx`; bundle B: `Orchestration` from `sections.jsx`
6. **Promo** — bundle A: `PromoBanner`; bundle B: `Promo`
7. **FAQ** — bundle A: `FaqSection`; bundle B: `FAQ`
8. **Footer** — rendered by the shell below the route body

## Section copy and UI — Hero

- **Eyebrow** (mono pill): `v0.4 · airegistry.mu`
- **H1 line 1:** `The Sovereign` + line break
- **H1 line 2 (gradient span class `gradient-text`):** `AI Registry.`
- **Subtitle (exact paragraph):** `Govern, orchestrate, and monitor trusted AI agents, models, and MCP infrastructure from a unified sovereign platform — built for nations, regulators, and the enterprises they depend on.`
- **Primary CTA:** `Launch Registry` + arrow icon; navigates hash to `registry`.
- **Secondary CTA:** `Explore Ecosystem`; navigates hash to `ecosystem`.
- **Hero meta row** (three items):
  1. Status dot + `All systems nominal`
  2. `SOC 2 · ISO 27001 · FedRAMP High` (inline style `var(--secondary)`)
  3. `build 2026.05.07-r3`
- **Floating cards** (three, with `animationDelay` 0s, 1.5s, 3s on container):
  - Card 1: kind `AI Agent`, name `agent.compliance-watch`, status `Active`, colour `#10b981`, provider `Internal`
  - Card 2: kind `AI Model`, name `claude-sonnet-4.5`, status `Verified`, colour `var(--secondary)`, provider `Anthropic`
  - Card 3: kind `MCP Skill`, name `mcp/treasury-ledger`, status `Trusted`, colour `var(--tertiary)`, provider `Government`
- **Hero visual:** `Globe` driven by `tweaks.motionIntensity`.

## Section copy — MetricsBar

Six metrics (label · target · suffix · trend) as in `components/metrics.jsx` `METRICS`:

| Label | Target | Suffix | Trend |
|---|---:|---|---|
| Listed Resources | 247 | — | +12 this month |
| Verified Providers | 89 | — | +4 this week |
| Sovereignty Reviews | 1842 | — | rolling 90d |
| Daily Discovery Calls | 56400 | — | +8.2% MoM |
| Uptime | 99.97 | % | 90-day SLO |
| Jurisdictions | 12 | — | national rollout |

`useCountUp` duration 1600ms; `%` row uses float display logic.

## Section copy — RegistrySection

- Eyebrow: `The Registry`
- H2: `Discover what your nation can ` + gradient span + `.` where gradient text is `trust and integrate`
- Search placeholder: `Search resources, providers, AIR-IDs…`
- Keyboard hint in UI: `⌘K`
- Kind tabs: `All resources`, `Models`, `Agents`, `MCP skills`, `Tools`
- Status label prefix: `Status` (uppercase mono in toolbar)
- Status chips: `verified`, `trusted`, `active`, `experimental`, `isolated`
- Clear control: `Clear filters`
- Empty state: `No resources match these filters.`
- Card actions: `View`, `AIR-ID`, `Report`

Mock catalog rows: reproduce `RESOURCES` in `registry.jsx` verbatim. Cross-reference `modules/public/registry/data-model.md` for the row shape.

## Section copy — GovernanceSection

- Eyebrow: `Governance, not Gatekeeping`
- H2: `Listing is not endorsement.` + line break + gradient span `Three independent signals do the work.`
- **Pillars** (four), titles + descriptions exactly as `PILLARS` in `governance.jsx`:
  1. Provider Verification
  2. Sovereignty Review
  3. Runtime Identity
  4. Open Audit Log
- **Trust panel** uppercase mono label: `Sovereignty Test`
  - H3: `Specific, not aspirational.`
  - Four rows: `Local law`, `Local data`, `Local systems`, `Language & culture`
  - Footer mono line: `Quality matters more than quantity. A registry of fifty credible resources is more useful than one of a thousand generic listings.`

## Section copy — Orchestration (Bundle A — `orchestration.jsx`)

- Eyebrow: `ORCHESTRATION FLOW`
- H2: `From discovery to govern —` + line break + `one continuous spine.`
- Subtitle: `Every artifact in the registry walks the same path. The same path your auditor will walk in six months.`
- Six stages (`STAGES`): each shows `STAGE / {num}` with `01`…`06`, titles **Discover, Verify, Approve, Deploy, Monitor, Govern**.
- Connecting line uses an SVG `linearGradient id="flow-grad"` with stops `var(--accent-2)` / `var(--accent-3)`; small SMIL `animate` circles with staggered `begin`.

## Section copy — Orchestration (Bundle B — `sections.jsx`)

- Eyebrow: `From Submission to Use`
- H2: `The journey is short, deliberate, and ` + gradient `exposes the boundaries` + `.`
- Paragraph: `Step 5 — actually using the resource — happens directly between consumer and provider. The registry is never on the runtime path.`
- Six stages `01`–`06`: Submit, Verify Provider, Review Sovereignty, Assign AIR-ID, Discover & Resolve, Maintain.

## Section copy — PromoBanner / Promo

**Bundle A (`promo-faq-footer.jsx`):**
- Eyebrow: `SOVEREIGN BY DEFAULT`
- H2: `Build trusted AI ecosystems` + `<br/>` + `with sovereign control.`
- Paragraph: `One registry. One control plane. Whatever jurisdiction you answer to.`
- CTAs: `Start Building` (primary + arrow), `Talk to Engineering` (secondary)

**Bundle B (`sections.jsx`):**
- Section inline padding `32px 32px 0`
- Eyebrow: `For Providers`
- H2: `List your sovereign AI resource.`
- Body (16px): `You keep hosting, access, runtime identity, and liability. The registry just helps the right people find you. Submission is open and reviewed within 10 working days.`
- CTAs: `Submit a Resource` (→ contact), `Read AIR-SPEC 0.4` (→ docs)

## Section copy — FaqSection / FAQ

**Bundle A:** Eyebrow `FREQUENTLY ASKED`, H2 `Questions, answered.`, subtitle `What teams ask before adopting a sovereign registry.`, eight Q/A pairs from `FAQS` in `promo-faq-footer.jsx` (first: `What is a Sovereign AI Registry?`).

**Bundle B:** Eyebrow `Common questions`, H2 `Questions that sovereign teams ` + gradient `actually ask` + `.`, six Q/A pairs from `FAQS` in `sections.jsx` (first: `Does the registry host any AI?`).

## Section copy — Footer

**Bundle A:** Brand mark + `Sovereign Registry`; brand paragraph; tags `SOC 2 TYPE II`, `ISO 27001`, `FedRAMP HIGH`, `EU AI ACT`; `FOOTER_COLS` columns + Ecosystem / Community rows; bottom row `© 2026 Sovereign Registry, PBC · All rights reserved.` + status dot + `ALL SYSTEMS NOMINAL · v3.2.1`.

**Bundle B:** Brand + Product / Resources / Providers / Governance / Legal columns; bottom row `© 2026 Sovereign AI Registry · airegistry.mu`, `BUILD 2026.05.07-r3 · TZ:GMT+4 · v0.4-mvp`, operational tag `Operational`, `v0.4 · MVP`.

## Visual and motion (non-negotiable)

- **Themes:** `data-theme="dark"` (default) and `data-theme="light"`; storage key `sar-theme`.
- **Palette:** `:root` defines `--primary`, `--secondary`, `--tertiary`. Tweaks panel cycles `PALETTES`: Sovereign Blue, Pacific Teal, Coral Magenta, Solar Amber.
- **Page background:** `body` uses `var(--bg-radial), var(--bg)` with `background-attachment: fixed`.
- **Gradient headings:** class `gradient-text` uses `background-clip: text` with `var(--grad-text)`.
- **Hero:** min-height `calc(100vh - 80px)`; `grid-bg` animated grid; eyebrow dot uses `@keyframes pulse` (2.6s ease-in-out infinite).
- **Float cards:** `animation: drift-y 7s ease-in-out infinite` with per-card delays.
- **Globe:** SVG gradients + filters; border circle SMIL opacity oscillation 6s; rotation via `requestAnimationFrame`; arc spawn interval derived from `motionIntensity`.
- **Reveal:** sections use `Reveal` with `opacity`/`translateY` 700ms cubic-bezier(.2,.8,.2,1); intersection threshold `0.12`.
- **Density tweak:** sets `--section-pad` to `80px / 120px / 160px` for compact / balanced / spacious.

## Navigation behaviour from this page

Internal hash navigation: each TopNav link, hero CTAs, FAQ "still have questions" link, promo CTAs all set `window.location.hash = "/route"`. Hash change → route updates → `window.scrollTo({top: 0, behavior: 'instant'})`.

External links open in a new tab.

The `Log In` CTA in the top nav navigates to `contact` in v0.4 (no real auth on the public site); production will swap to a sign-in flow.

## Out of scope on this page

- Registry detail / drill-down (that's `modules/admin/resources` and `modules/sovereign/catalog`).
- Authenticated portals (admin / provider / sovereign / verifier).
- Submission / publish flow (`modules/provider/publish`).
- Per-jurisdiction localisation (planned).
