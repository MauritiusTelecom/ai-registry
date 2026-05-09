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

# Public · Governance module — Data model

The standalone governance route renders **two charter cards** with hard-coded copy in `GovernancePage` (`components/pages.jsx`). There is no fetched data; the prototype embeds the lists inline.

## CharterCard

```ts
type CharterCard = {
  heading: 'What it is' | 'What it is not';
  bullets: Array<string | InlineMarkup>;   // inline markup is restricted to mono spans
};

type InlineMarkup = {
  parts: Array<
    | { kind: 'text'; value: string }
    | { kind: 'mono'; value: string; color: 'var(--text)' | 'var(--text-2)' }
  >;
};
```

### v0.4 mock corpus

```ts
const charter: CharterCard[] = [
  {
    heading: 'What it is',
    bullets: [
      'A locally-governed catalogue of sovereign AI resources.',
      { parts: [
        { kind: 'text', value: 'Stable identifiers under ' },
        { kind: 'mono', value: 'air://', color: 'var(--text)' },
        { kind: 'text', value: '.' },
      ] },
      'Three independent governance signals: provider-verified, sovereignty-reviewed, official-resource.',
      'An open, append-only audit log.',
    ],
  },
  {
    heading: 'What it is not',
    bullets: [
      'A runtime, gateway or proxy.',
      'A certification authority. (Listing ≠ endorsement.)',
      'A marketplace or payment layer.',
      'A hosting provider for any AI resource.',
    ],
  },
];
```

The Unicode "not equal to" sign U+2260 in `Listing ≠ endorsement` MUST be preserved.

## Authoritative response shape (production)

The page is intentionally static. Production may either:

1. **Inline the copy** (recommended) — the same as v0.4. The two cards are part of the registry's published charter and changing them is a governance act, not a content edit.
2. **Serve from `/public/governance`** — if production wants editorial control, the endpoint shape is:

```ts
type PublicGovernanceResponse = {
  charter: CharterCard[];
  publishedAt: string;     // ISO date the current charter was ratified
  generatedAt: string;     // ISO date-time the response was generated
};
```

If served, ratification of a new charter MUST go through the same governance process documented in `airegistry-specs/governance/`.

## Constraints / invariants

- The two cards' headings MUST be `What it is` and `What it is not` (in that order). Production must NOT translate without a corresponding governance decision.
- The bullets MUST cover the three governance signals (provider-verified, sovereignty-reviewed, official-resource) and the four NOT-bullets (runtime, certification, marketplace, hosting). Adding bullets is allowed; removing requires a charter amendment.
- Mono inline tokens are limited to `air://` in v0.4. Production may add `air-spec/` and other registry vocabulary as more charter mentions arise.

## Reference data on this page

- **Card heading style**: `<h3>` inside `.glass` card, default H3 styling from `styles.css`.
- **Bullet list style**: `paddingLeft: 18, color: var(--text-2), fontSize: 14, lineHeight: 1.65`.
- **Mono token style**: `<span class="mono" style="color: var(--text)">air://</span>` — colour is the **primary text** colour to make it pop against the muted body.
