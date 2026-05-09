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

# Public · Governance module — Permissions and access

## Surface classification

The public `/governance` route is **unauthenticated public content**. The charter is the registry's public commitment to what it will and will not do; visibility to anyone — including search engines, regulators, citizen reviewers — is the point.

## Authentication binding

There is **no required authentication** to view this route. The TopNav `Log In` CTA is shell-owned and never gates the page body.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| PageHero (crumbs / title / subtitle) | none | Public copy. |
| Card 1 (What it is) | none | Charter affirmations. |
| Card 2 (What it is not) | none | Charter denials. |
| Mono inline tokens (`air://`) | none | Plain text in v0.4; production may link to docs. |

## Anonymous-visitor data handling

- The page renders the same static payload to every visitor; there is no per-visitor variation.
- Telemetry events are anonymous and MUST NOT include any free-form input (the page has none).

## Content moderation

- The charter is **operator-curated** AND governance-locked. Production must NOT allow the copy on this page to change without a corresponding ratification in `airegistry-specs/governance/`.
- The bullet lists are NOT user-generated content. The page MUST NOT accept comments, edits, or suggestions on this surface; the planned `Suggest amendment` flow lives in the Contact route.

## Audit obligations

- Reading the public governance page writes nothing to the audit ledger.
- Charter ratification (admin-side, out of scope here) writes `governance.charter.ratified` to the immutable audit ledger AND publishes a new `publishedAt` timestamp.
- An amendment that changes any bullet wording MUST be paired with a public note on the Documentation page describing the change history.

## Negative cases

- **Server unreachable**: irrelevant for v0.4 (the charter is inline). For production-served charters, render the PageHero plus an inline error block.
- **JavaScript disabled**: production must serve a static fallback HTML containing the same two cards as plain `<section>` blocks. The charter is by definition the registry's public commitment; it must remain readable without JS.

## Data residency

- The charter is **not regionalised**. Every visitor sees the same English text in v0.4.
- Production may add localisation later; if so, every locale MUST go through the governance ratification process — the `What it is not` bullets are particularly sensitive to translation drift.
- The Unicode "not equal to" sign U+2260 in `Listing ≠ endorsement` MUST be preserved exactly; do not substitute `!=` or other surrogates without a governance amendment.

## Read-only invariants

- This page MUST NOT offer any `Edit` or `Suggest` affordance under any role. Charter changes are batched and infrequent — they happen via the planned admin governance surface, not via inline edits.
