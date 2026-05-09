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

# Public · Home module — Data model

The home page is **client-side only** in the prototype. This document lists the fields and constants the UI binds to so production implementations can preserve structure and values.

For deeper coverage of each section's data, cross-reference the per-route modules:

- `modules/public/registry/data-model.md` — RegistrySection mock catalog rows.
- `modules/public/governance/data-model.md` — pillars + sovereignty test panel.
- `modules/public/ecosystem/data-model.md` — partners tiers (only relevant if the home page surfaces them in a future revision).
- `modules/landing/data-model.md` — original canonical specification.

## Tweaks state (`app.jsx` → `useTweaks`)

```ts
type Tweaks = {
  accentPalette: 0 | 1 | 2 | 3;        // index into PALETTES
  motionIntensity: 0 | 1 | 2 | 3;      // passed to Globe
  density: 'compact' | 'balanced' | 'spacious';
  heroVariant: 'globe';                // reserved; hero always mounts Globe
};
```

Defaults:

```json
{
  "accentPalette": 0,
  "motionIntensity": 1,
  "density": "balanced",
  "heroVariant": "globe"
}
```

## Accent palettes (`app.jsx` `PALETTES`)

| idx | label | primary | secondary | tertiary |
|---|---|---|---|---|
| 0 | Sovereign Blue | `59,130,246` | `6,182,212` | `168,85,247` |
| 1 | Pacific Teal | `20,184,166` | `52,211,153` | `14,165,233` |
| 2 | Coral Magenta | `236,72,153` | `244,114,182` | `168,85,247` |
| 3 | Solar Amber | `245,158,11` | `251,191,36` | `239,68,68` |

`applyPalette(idx)` writes `--primary-rgb`, `--secondary-rgb`, `--tertiary-rgb` to `documentElement.style` plus the computed `rgb(...)` values.

`applyDensity(d)` sets `--section-pad` to `80px / 120px / 160px` for `compact / balanced / spacious`.

## HeroFloatCard (3 cards)

```ts
type HeroFloatCard = {
  kind: 'AI Agent' | 'AI Model' | 'MCP Skill';
  name: string;            // e.g. "agent.compliance-watch"
  status: 'Active' | 'Verified' | 'Trusted';
  statusColor: string;     // CSS colour token or hex
  provider: string;        // "Internal" | "Anthropic" | "Government"
  animationDelay: '0s' | '1.5s' | '3s';
};
```

v0.4 instances reproduced in `product.md` Hero section.

## MetricsBar (`components/metrics.jsx` `METRICS`)

```ts
type Metric = {
  label: string;
  target: number;
  suffix?: string;     // "%" or none
  trend: string;       // free-form trend caption
};
```

Six rows reproduced in `product.md` Metrics section. `useCountUp` duration is 1600ms across all rows.

## RegistrySection — see `modules/public/registry/data-model.md`

The home page renders the same mock catalog as the standalone `/registry` route. Don't drift between them.

## GovernanceSection — see `modules/public/governance/data-model.md`

The home page renders the same four pillars + Sovereignty Test as the standalone `/governance` route's source data; the standalone page wraps the same data in a `PageHero` plus a "What it is / What it is not" pair of cards.

## OrchestrationStages

```ts
type OrchestrationStage = {
  num: '01' | '02' | '03' | '04' | '05' | '06';
  title: string;       // bundle A: "Discover" / "Verify" / "Approve" / "Deploy" / "Monitor" / "Govern"
                        // bundle B: "Submit" / "Verify Provider" / "Review Sovereignty" / "Assign AIR-ID" / "Discover & Resolve" / "Maintain"
  description: string;
};
```

Reproduce the six rows verbatim from the bundle's `STAGES` array. Both bundles render six stages but the titles differ (intentional — tied to the bundle's framing).

## FAQ entries

```ts
type FaqEntry = {
  q: string;
  a: string;
};
```

- Bundle A: 8 entries from `FAQS` in `promo-faq-footer.jsx`.
- Bundle B: 6 entries from `FAQS` in `sections.jsx`.

The accordion is single-open (open one, others auto-close).

## Footer columns

Bundle A (`promo-faq-footer.jsx` `FOOTER_COLS`): 5 columns — Product / Resources / Providers / Governance / Company. Each column has a header and link rows.

Bundle B (`sections.jsx` `Footer`): 5 columns — Product / Resources / Providers / Governance / Legal.

Reproduce the column rows verbatim from the source.

## Local state on this page

- **`Tweaks`** — `useTweaks` (in-memory; persisted to `localStorage` key `sar-tweaks` per `tweaks-panel.jsx`).
- **`reportTarget`** — `null` or the registry card whose `Report` action was just clicked. Drives the `ReportModal` open state.
- **Theme** — `useTheme` from `primitives.jsx`; persisted to `localStorage` key `sar-theme`.
- **Route** — `useRouter` from `primitives.jsx`; bound to `window.location.hash`.

The home page itself holds no other state.

## Constraints / invariants

- The eight sections render in a fixed order (see `product.md`).
- `Reveal` IS the only animation primitive that defers content until intersection — production must keep this so above-the-fold copy paints immediately.
- `Globe` motion intensity is a **client-side cosmetic** — never tied to server-driven data. Don't gate it on auth state.
- The mock metrics are FIXED v0.4 values. Production should serve real numbers via `GET /public/metrics` (out of scope of this module).

## Reference data on this page

- **Tweaks defaults**: object above.
- **Palettes**: 4-row table above.
- **Density values**: `compact | balanced | spacious`.
- **Bundle distinction**: `index.html` (bundle A) vs `home-spa.html` / `Sovereign AI Registry.html` (bundle B). The bundles differ in which orchestration / promo / FAQ / footer they render — see `modules/landing/product.md`.
