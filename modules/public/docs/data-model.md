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

# Public · Documentation module — Data model

## DocSection

Mirrors the `sections` array in `DocsPage` (`components/pages.jsx`).

```ts
type DocSection = {
  id: string;          // anchor id ("overview" | "air-id" | "metadata" | "verification" | "review")
  label: string;       // display label, used in sticky nav AND H3
  body: string;        // body paragraph (plain text; em dashes / curly quotes preserved)
};
```

### Field semantics

- **`id`** — URL anchor (after the route hash); MUST be kebab-case and stable across spec versions. Production: changing an id breaks deep links — treat as a versioned change.
- **`label`** — the same string is used in the sticky nav and the section H3.
- **`body`** — single-paragraph summary. The `<pre>` code example below it is templated from `id` (see product.md).

### v0.4 mock corpus (5 sections)

| # | id | label | body |
|---:|---|---|---|
| 01 | overview | Overview | AIR-SPEC 0.4 defines the listing schema, sovereignty rubric, identifier format, and verification proofs the registry implements. |
| 02 | air-id | AIR-ID format | air://&lt;jurisdiction&gt;/&lt;kind&gt;/&lt;provider&gt;/&lt;name&gt;@&lt;version&gt; — stable, resolvable, and human-readable. |
| 03 | metadata | Listing metadata | Provider, kind, sovereignty bases with evidence, contact, terms, license, region, optional SPIFFE trust domain. |
| 04 | verification | Provider verification | DNS TXT and email-based proofs. Any mismatch flips status to "unverified" and surfaces a public note. |
| 05 | review | Review workflow | Reviewers apply the published checklist, record signed notes, and assign a status. Appeals are public. |

The `air://<…>` syntax in section 02 uses literal angle brackets in the body string (Unicode less-than / greater-than U+003C / U+003E). Em dash U+2014 separates the syntax from the description. Curly quotes U+201C / U+201D wrap `unverified` in section 04.

## Code example template

The `<pre>` block under each section's body uses this template:

```
# example
GET /.well-known/air-spec/${id}
→ 200 OK  application/yaml
```

Where `${id}` substitutes the section's `id`. The arrow is Unicode rightwards arrow U+2192. Note the **two spaces** between `200 OK` and `application/yaml` (intentional alignment).

## Authoritative response shape (production)

The page is intentionally static in v0.4. Production may either:

1. **Inline the sections** (recommended for the v0.4 spec snapshot) — same as v0.4.
2. **Serve from `/public/docs/spec`** — if production wants editorial control:

```ts
type PublicDocsResponse = {
  specVersion: string;        // "v0.4-MVP"
  publishedAt: string;        // ISO date
  sections: DocSection[];
  generatedAt: string;        // ISO date-time
};
```

Versioned changes to a section MUST advance `specVersion`; breaking changes to an `id` MUST advance the major.

## Constraints / invariants

- `sections.length === 5` in v0.4. Production may add sections; ordering MUST keep the existing five at positions 01–05 to preserve deep links.
- The eyebrow numbering (`§ NN`) is derived at render time from the array position, NOT stored on the row. If a section is removed, downstream numbering shifts.
- Section labels are also section H3s — changing a label changes both surfaces.
- Body strings MUST preserve Unicode glyphs (em dash, curly quotes, angle brackets, section sign).

## Reference data on this page

- **Section sign**: `§` (U+00A7), used in the eyebrow `§ NN {label}`.
- **Em dash**: `—` (U+2014), used in section 02's body.
- **Curly quotes**: `"` `"` (U+201C, U+201D), used in section 04's body.
- **Rightwards arrow**: `→` (U+2192), used in the code example template.
- **Angle brackets** (in air:// syntax): `<` `>` (U+003C, U+003E).
