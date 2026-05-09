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

# Landing module — Home page (public marketing shell)

## Purpose

Specify the **home route** of the Sovereign AI Registry marketing experience so production code can mirror the Claude design prototype **without altering** user-visible copy, colour values, gradients, or motion behaviour.

**Data specs:** conceptual entities and relationships — [`data-model.md`](data-model.md); prototype fields, enums, and static datasets — [`data-dictionary.md`](data-dictionary.md).

## Source of truth (prototype)

Implementation must follow these files under `airegistry-prototype/claudedesign/`:

| Concern | Files |
|--------|--------|
| App shell, route switch, tweak defaults | `app.jsx` |
| Global layout, theme tokens, typography, hero, metrics, registry, governance, orchestration visuals, promo, FAQ, footer, motion | `styles.css` |
| Theme, hash router, auth mock, Reveal, icons, count-up | `components/primitives.jsx` |
| Sticky nav, theme toggle, user menu | `components/nav.jsx` |
| Hero + floating entity cards + globe stage | `components/hero.jsx`, `components/globe.jsx` |
| Animated metrics strip | `components/metrics.jsx` |
| Registry browse UI + mock catalog | `components/registry.jsx` |
| Governance pillars + sovereignty test panel | `components/governance.jsx` |
| Report listing modal | `components/modal.jsx` |
| Design-time tweaks panel | `tweaks-panel.jsx` |

## HTML entrypoints (do not merge behaviour)

Two static bundles exist. **Pick the same entry the design server uses** and keep it stable.

### A — `index.html` (default full bundle)

Script order ends with aliases so `app.jsx` receives:

- `Orchestration` → `OrchestrationSection` from `components/orchestration.jsx`
- `Promo` → `PromoBanner` from `components/promo-faq-footer.jsx`
- `FAQ` → `FaqSection` from `components/promo-faq-footer.jsx`
- `Footer` → last assignment from `components/promo-faq-footer.jsx`

`components/sections.jsx` is **not** loaded.

### B — `home-spa.html`

Loads `components/sections.jsx` instead of `orchestration.jsx` and `promo-faq-footer.jsx`. Then `app.jsx` uses:

- `Orchestration`, `Promo`, `FAQ`, `Footer` from `components/sections.jsx`

Orchestration copy, promo block, FAQ set, and footer columns **differ** from bundle A. Implementation must match the chosen bundle exactly.

## Document title and fonts

- HTML `<title>`: `Sovereign AI Registry`
- **Bundle A (`index.html`)**: Google Fonts link includes Inter + IBM Plex Mono + IBM Plex Sans (weights as in HTML).
- **Bundle B (`home-spa.html`)**: IBM Plex Sans + IBM Plex Mono only (weights as in HTML).

Body font stack in CSS: `'IBM Plex Sans', 'Inter', system-ui, sans-serif` (see `styles.css`).

## Shell (all routes, including home)

Rendered by `app.jsx` around `Routes`:

1. **TopNav** — logo text `Sovereign Registry`; links: `Home`, `Registry`, `Ecosystem`, `Governance`, `Documentation`, `Contact` (hash `home`, `registry`, `ecosystem`, `governance`, `docs`, `contact`).
2. **Route body** — for `home` / default: sections below.
3. **Footer** — depends on bundle (A vs B).
4. **ReportModal** — opens when user triggers report on a registry card (not part of hero body but global on home).
5. **TweaksPanel** — design-time only; default tweak object in `app.jsx`:

```json
{
  "accentPalette": 0,
  "motionIntensity": 1,
  "density": "balanced",
  "heroVariant": "globe"
}
```

`heroVariant` is reserved in defaults; hero uses `Globe` with `motionIntensity`.

## Home route — vertical order (`HomePage` in `app.jsx`)

1. **Hero** (`components/hero.jsx`)
2. **MetricsBar** (`components/metrics.jsx`)
3. **RegistrySection** (`components/registry.jsx`)
4. **GovernanceSection** (`components/governance.jsx`)
5. **Orchestration** (bundle A: `OrchestrationSection`; bundle B: `Orchestration` in `sections.jsx`)
6. **Promo** (bundle A: `PromoBanner`; bundle B: `Promo` in `sections.jsx`)
7. **FAQ** (bundle A: `FaqSection`; bundle B: `FAQ` in `sections.jsx`)

---

## Section copy and UI — Hero

- **Eyebrow** (mono pill): `v0.4 · airegistry.mu`
- **H1 line 1:** `The Sovereign` + line break  
- **H1 line 2 (gradient span class `gradient-text`):** `AI Registry.`
- **Subtitle (exact paragraph):**  
  `Govern, orchestrate, and monitor trusted AI agents, models, and MCP infrastructure from a unified sovereign platform — built for nations, regulators, and the enterprises they depend on.`
- **Primary CTA:** `Launch Registry` + arrow icon; navigates hash to `registry`.
- **Secondary CTA:** `Explore Ecosystem`; navigates hash to `ecosystem`.
- **Hero meta row (three items):**
  1. Status dot + `All systems nominal`
  2. `SOC 2 · ISO 27001 · FedRAMP High` (inline style colour `var(--secondary)`)
  3. `build 2026.05.07-r3`
- **Floating cards** (three, with `animationDelay` 0s, 1.5s, 3s on container):
  - Card 1: kind `AI Agent`, name `agent.compliance-watch`, status `Active`, colour `#10b981`, provider `Internal`
  - Card 2: kind `AI Model`, name `claude-sonnet-4.5`, status `Verified`, colour `var(--secondary)`, provider `Anthropic`
  - Card 3: kind `MCP Skill`, name `mcp/treasury-ledger`, status `Trusted`, colour `var(--tertiary)`, provider `Government`
- **Hero visual:** `Globe` component driven by `tweaks.motionIntensity` (see `flows.md` / `data-dictionary.md`).

---

## Section copy — MetricsBar

Six metrics (labels, animated targets, suffixes, trend strings) — exact strings in `components/metrics.jsx` `METRICS` array:

| Label | Target | Suffix | Trend |
|-------|--------|--------|-------|
| Listed Resources | 247 | (none) | +12 this month |
| Verified Providers | 89 | (none) | +4 this week |
| Sovereignty Reviews | 1842 | (none) | rolling 90d |
| Daily Discovery Calls | 56400 | (none) | +8.2% MoM |
| Uptime | 99.97 | % | 90-day SLO |
| Jurisdictions | 12 | (none) | national rollout |

---

## Section copy — RegistrySection

- Eyebrow: `The Registry`
- H2: `Discover what your nation can ` + gradient span + `.` where gradient text is `trust and integrate`
- Supporting paragraph ends with stable identifier prose: `air://` (styled mono / secondary text per JSX).
- Search placeholder: `Search resources, providers, AIR-IDs…`
- Keyboard hint in UI: `⌘K`
- Kind tabs: `All resources`, `Models`, `Agents`, `MCP skills`, `Tools` (with icons per `KINDS`).
- Status label prefix: `Status` (uppercase mono styling in toolbar).
- Status chips: `verified`, `trusted`, `active`, `experimental`, `isolated`
- Clear control: `Clear filters`
- Empty state: `No resources match these filters.`
- Card actions: `View`, `AIR-ID`, `Report`

Mock catalog rows: reproduce `RESOURCES` in `registry.jsx` verbatim (titles, providers, descriptions, tags, status, glyph, kind, context, latency, region, license).

---

## Section copy — GovernanceSection

- Eyebrow: `Governance, not Gatekeeping`
- H2: `Listing is not endorsement.` + line break + gradient span `Three independent signals do the work.`
- Intro paragraph: as in `governance.jsx` (registry exposes governance metadata; status labels explicit).

**Pillars** (four): titles and descriptions exactly as `PILLARS` in `governance.jsx`:

1. Provider Verification  
2. Sovereignty Review  
3. Runtime Identity  
4. Open Audit Log  

**Trust panel** — uppercase mono label: `Sovereignty Test`  
- H3: `Specific, not aspirational.`  
- Body paragraph on qualification (law, dataset, institution, language asset, cultural artefact).  
- Four rows: `Local law`, `Local data`, `Local systems`, `Language & culture` with bodies as in source.  
- Footer mono line: `Quality matters more than quantity. A registry of fifty credible resources is more useful than one of a thousand generic listings.`

---

## Bundle A — OrchestrationSection (`orchestration.jsx`)

- Eyebrow: `ORCHESTRATION FLOW` (all caps in source)
- H2: `From discovery to govern —` + line break + `one continuous spine.`
- Subtitle: `Every artifact in the registry walks the same path. The same path your auditor will walk in six months.`
- Stages (six): each shows `STAGE / {num}` with num `01`…`06`, titles Discover, Verify, Approve, Deploy, Monitor, Govern — descriptions exactly as in `STAGES` array.
- Between stages: small SVG circle with SMIL `animate` on opacity (`2s`, staggered `begin`).
- `orch-flow-line` SVG with linearGradient `flow-grad` stops using `var(--accent-2)` / `var(--accent-3)` as in file.

---

## Bundle B — Orchestration (`sections.jsx`)

- Eyebrow: `From Submission to Use`
- H2: `The journey is short, deliberate, and ` + gradient `exposes the boundaries` + `.`
- Paragraph: `Step 5 — actually using the resource — happens directly between consumer and provider. The registry is never on the runtime path.`
- Six stages `01`–`06`: Submit, Verify Provider, Review Sovereignty, Assign AIR-ID, Discover & Resolve, Maintain — copy from `STAGES` in `sections.jsx`.

---

## Bundle A — PromoBanner (`promo-faq-footer.jsx`)

- Eyebrow: `SOVEREIGN BY DEFAULT`
- H2: `Build trusted AI ecosystems` + `<br/>` + `with sovereign control.`
- Paragraph: `One registry. One control plane. Whatever jurisdiction you answer to.`
- CTAs: `Start Building` (primary + arrow), `Talk to Engineering` (secondary); both `href="#"` in prototype.

---

## Bundle B — Promo (`sections.jsx`)

- Section inline padding: `32px 32px 0`
- Eyebrow: `For Providers`
- H2: `List your sovereign AI resource.`
- Body (`fontSize: 16`): `You keep hosting, access, runtime identity, and liability. The registry just helps the right people find you. Submission is open and reviewed within 10 working days.`
- CTAs: `Submit a Resource` (→ contact), `Read AIR-SPEC 0.4` (→ docs)

---

## Bundle A — FaqSection (`promo-faq-footer.jsx`)

- Eyebrow: `FREQUENTLY ASKED`
- H2: `Questions, answered.`
- Subtitle: `What teams ask before adopting a sovereign registry.`
- FAQ list: eight Q/A pairs exactly as `FAQS` in `promo-faq-footer.jsx` (first question: `What is a Sovereign AI Registry?`).

---

## Bundle B — FAQ (`sections.jsx`)

- Eyebrow: `Common questions`
- H2: `Questions that sovereign teams ` + gradient `actually ask` + `.`
- Six Q/A pairs exactly as `FAQS` in `sections.jsx` (first question: `Does the registry host any AI?`).

---

## Bundle A — Footer (`promo-faq-footer.jsx`)

- Brand line: `Sovereign Registry` (with logo mark)
- Brand paragraph: `The trusted control plane for sovereign AI ecosystems. Built for nations, regulators, and the enterprises they answer to.`
- Tags: `SOC 2 TYPE II`, `ISO 27001`, `FedRAMP HIGH`, `EU AI ACT`
- Column headers and link labels: `FOOTER_COLS` + Ecosystem / Community rows as in source
- Bottom left: `© 2026 Sovereign Registry, PBC · All rights reserved.`
- Bottom right: status dot + `ALL SYSTEMS NOMINAL · v3.2.1`

---

## Bundle B — Footer (`sections.jsx`)

- Brand, Product / Resources / Providers / Governance / Legal columns and bottom bar strings exactly as in `Footer` function in `sections.jsx` (includes `© 2026 Sovereign AI Registry · airegistry.mu`, `BUILD 2026.05.07-r3 · TZ:GMT+4 · v0.4-mvp`, operational tag `Operational`, `v0.4 · MVP`, etc.).

---

## Visual and motion (non-negotiable mirror)

Do **not** paraphrase tokens; bind CSS custom properties and classes as in `styles.css`.

- **Themes:** `data-theme="dark"` (default) and `data-theme="light"` on `documentElement`; stored key `sar-theme` in `localStorage`.
- **Palette:** `:root` defines `--primary`, `--secondary`, `--tertiary` and RGB triples; `--grad-text` is `linear-gradient(13deg, var(--primary) 0%, var(--tertiary) 100%)`; `--grad-accent`, `--grad-border`, `--grad-glow` as defined. Tweaks panel **Accent palette** cycles `PALETTES` in `app.jsx` (Sovereign Blue, Pacific Teal, Coral Magenta, Solar Amber) via `applyPalette` setting `--primary-rgb`, `--secondary-rgb`, `--tertiary-rgb` and computed `rgb(...)`.
- **Page background:** `body` uses `var(--bg-radial), var(--bg)` with `background-attachment: fixed`; theme transition `background-color 240ms ease, color 240ms ease`.
- **Gradient headings:** class `gradient-text` uses `background-clip: text` with `var(--grad-text)`.
- **Hero:** min-height `calc(100vh - 80px)`; two-column grid breaking to one column ≤1024px; `grid-bg` animated grid with radial mask; eyebrow dot uses `@keyframes pulse` (2.6s ease-in-out infinite).
- **Float cards:** `animation: drift-y 7s ease-in-out infinite` with per-card `animationDelay`; border image `var(--grad-border)`.
- **Globe:** SVG gradients and filters as in `globe.jsx`; border circle SMIL opacity oscillation 6s; rotation via `requestAnimationFrame`; arc spawn interval derived from `motionIntensity`.
- **Metrics:** `useCountUp` duration 1600ms; `%` row uses float display logic in `MetricCell`.
- **Reveal:** sections use `Reveal` with `opacity`/`translateY` transition 700ms cubic-bezier(.2,.8,.2,1); intersection threshold `0.12`.
- **Buttons:** primary uses `var(--grad-accent)`, hover `filter: brightness(1.08)`, `translateY(-1px)` and box-shadow as in `.btn-primary`.
- **FAQ:** accordion via CSS grid `grid-template-rows` on `.faq-a`; open state rotates `.faq-icon` as in stylesheet.
- **Footer glow:** `.footer-glow` uses `--footer-glow-opacity` per theme.
- **Density tweak:** sets `--section-pad` to `80px` / `120px` / `160px` for compact / balanced / spacious.

## Report modal (strings)

When opened from a card: title `Report this resource`, subtitle `{title} · {provider}`. Success title `Report received`; success body thanks message ending `within 5 working days.` Form labels and reason options exactly as `modal.jsx`. Validation messages: `Select a reason`, `Add at least 12 characters of context`, `Valid email required`.

## Non-goals for landing spec

- No requirement to replicate portal HTML files from `portals/` on the home page.
- Backend APIs are out of scope for this document; prototype uses client-only state.
