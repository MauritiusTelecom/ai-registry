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

# Landing module — Data dictionary (fields and constants)

Client-side prototype bindings: **fields, enums, and static datasets** the home UI uses. For **entities and relationships** only, see [`data-model.md`](data-model.md).

## Tweaks state (`app.jsx` → `useTweaks`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `accentPalette` | integer index | `0` | Selects entry in `PALETTES` |
| `motionIntensity` | number 0–3 | `1` | Passed to `Globe`; affects animation speed / arc spawn interval |
| `density` | string | `"balanced"` | `compact` \| `balanced` \| `spacious` |
| `heroVariant` | string | `"globe"` | Reserved in defaults; hero always mounts `Globe` |

## Accent palettes (`app.jsx` `PALETTES`)

Each entry: `primary`, `secondary`, `tertiary` as **RGB triple strings** (comma-separated, no `rgb()`), plus `label`:

1. `Sovereign Blue` — `59,130,246` / `6,182,212` / `168,85,247`
2. `Pacific Teal` — `20,184,166` / `52,211,153` / `14,165,233`
3. `Coral Magenta` — `236,72,153` / `244,114,182` / `168,85,247`
4. `Solar Amber` — `245,158,11` / `251,191,36` / `239,68,68`

Tweak radio shows shortened label (first word of `label`).

## Theme persistence

- Key: `sar-theme` in `localStorage`; values `dark` \| `light`.
- Initial theme: stored value, else `prefers-color-scheme: light` → `light`, else `dark`.

## Router state

- `route`: string from hash segment, default `home`.

## Auth user (mock)

Shape: `{ firstName, email, roles: string[] }`.

Presets from `login(preset)`:

| Preset | firstName | email | roles |
|--------|-----------|-------|-------|
| `admin` | John | john@gov.mu | `admin`, `provider`, `verifier`, `sovereign` |
| `provider` | Aisha | aisha@anthropic.com | `provider` |
| `member` | Marc | marc@example.com | `[]` |

`login()` default argument if called without preset: `'admin'`.

## Registry catalog item (`RESOURCES` in `registry.jsx`)

Each row:

| Field | Description |
|-------|-------------|
| `id` | Stable string id |
| `kind` | `model` \| `agent` \| `skill` \| `tool` |
| `glyph` | Two–three letter badge text |
| `title` | Display name |
| `provider` | Organisation string |
| `status` | `verified` \| `trusted` \| `active` \| `experimental` \| `isolated` |
| `desc` | Card body |
| `context` | Meta row |
| `latency` | Meta row |
| `region` | Meta row |
| `license` | Meta row |
| `tags` | string array for chips and search |

**Count:** 13 resources as shipped in `registry.jsx` (preserve ids and copy when mirroring).

## Registry toolbar constants

- `KINDS`: ids `all`, `model`, `agent`, `skill`, `tool` with labels and icon names as in source.
- `STATUS_FILTERS`: order `verified`, `trusted`, `active`, `experimental`, `isolated`.

## Metrics (`METRICS` in `metrics.jsx`)

See [`product.md`](product.md) table (six rows: label, target, suffix, trend).

## Governance pillars (`PILLARS` in `governance.jsx`)

Four objects: `icon`, `title`, `desc` — copy verbatim from source.

## Orchestration stages

- **Bundle A (`orchestration.jsx`):** six objects — `num` display as `STAGE / 01` format in UI, `title`, `desc`, `icon`.
- **Bundle B (`sections.jsx`):** six objects — `num` `01`–`06`, `icon`, `title`, `desc` (different pipeline copy).

## FAQ content

- **Bundle A:** `FAQS` array in `promo-faq-footer.jsx` (8 items).
- **Bundle B:** `FAQS` array in `sections.jsx` (6 items).

## Report modal form model

- `reason`: enum option values `impersonation`, `sovereignty`, `metadata`, `abuse`, `legal`, `other`
- `details`: string, min effective length 12 trimmed
- `email`: valid email pattern as in [`flows.md`](flows.md)

## Hero floating cards (static props)

Three card configs in `hero.jsx`: positions (`top`/`left`/`right`/`bottom` percentages), `kind`, `name`, `status`, `statusColor`, `provider`, `delay` (seconds).

## Nav items (`nav.jsx` `NAV_ITEMS`)

Order: home, registry, ecosystem, governance, docs, contact — labels as in source.

## Footer link models

- **Bundle A:** `FOOTER_COLS` plus hard-coded Ecosystem and Community lists in `promo-faq-footer.jsx`.
- **Bundle B:** inline lists in `Footer` within `sections.jsx`.

## CSS variables used by orchestration SVG

`components/orchestration.jsx` references `var(--accent-2)` and `var(--accent-3)` for the stage connector dots and `flow-grad` gradient stops. Those names are **not** defined in `styles.css` in-repo; the running design may still resolve them via injected or inherited rules. When implementing bundle A, define these variables (or equivalent mapped colours) so the orchestration strip matches the live prototype’s appearance — without changing the gradient stop structure in the SVG.
