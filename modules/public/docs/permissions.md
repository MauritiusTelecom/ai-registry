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

# Public · Documentation module — Permissions and access

## Surface classification

The public `/docs` route is **unauthenticated public content**. The AIR-SPEC is intentionally surfaceable to anonymous visitors, integrators, regulators, and search engines.

## Authentication binding

There is **no required authentication** to view this route. The TopNav `Log In` CTA is shell-owned and never gates the page body.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| PageHero (crumbs / title / subtitle) | none | Public copy. |
| Sticky nav links | none | In-page anchors only. |
| Section blocks (eyebrow / H3 / body / code) | none | Public copy + canonical YAML examples. |
| `Copy` code button (production) | none | `navigator.clipboard.writeText(codeText)` only. |
| `/.well-known/air-spec/{id}` YAML fetch | none | Public spec endpoint; no auth. |

## Anonymous-visitor data handling

- The page renders the same payload to every visitor; no per-visitor variation.
- Sticky nav anchor clicks emit `public.docs.nav_link.clicked` with `id` only — no PII.
- Code-block copy actions emit `public.docs.code.copied` with `sectionId` — no PII.

## Content moderation

- The spec is **operator-curated** AND governance-locked. Production must NOT allow inline edits to the published spec text on this page.
- Future spec amendments go through the same governance ratification flow as the public charter (`modules/public/governance/`).

## Audit obligations

- Reading the public docs page writes nothing to the audit ledger.
- Spec ratification (admin-side, out of scope here) writes `docs.spec.ratified` to the immutable audit ledger AND advances `specVersion`.

## Negative cases

- **JavaScript disabled**: production must serve a static fallback HTML containing the same five sections plus the sticky nav as a flat `<aside><nav>`. The spec must remain readable without JS.
- **Server unreachable** (production-fetched mode): render the PageHero and the sticky nav (with known section ids) plus a single inline error block in the right column.
- **Stale spec cache**: the SPA should display the cached `specVersion` in the page footer and surface an "Updated `${date}`" line; if the user is viewing an older spec, production may show a top banner `Spec v0.5 is now published — view latest`.

## Data residency

- The spec is **not regionalised**. Every visitor sees the same English text in v0.4.
- The `/.well-known/air-spec/{id}` endpoint is intentionally world-readable and CDN-cacheable globally.
- Localised translations (planned) MUST be served from `/.well-known/air-spec/{id}.{locale}.yaml` with locale-specific cache keys.
