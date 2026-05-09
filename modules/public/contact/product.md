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

# Public · Contact module — Talk to the operator

## Purpose

Specify the **`#/contact` route** of the public marketing site so production code can mirror the Claude design prototype **without altering** copy, colour values, gradients, or motion behaviour.

This route is the public funnel for everything that requires human contact — submitting a resource, requesting review, reporting an issue, or talking to the team about standing up a registry in another jurisdiction.

## Source of truth (prototype)

| Concern | Files |
|---------|-------|
| HTML entry | `index.html` (bundle A) or `Sovereign AI Registry.html` (bundle B) |
| Route table | `app.jsx` (`case 'contact': return <ContactPage/>`) |
| Page component (`ContactPage`, `PageHero`) | `components/pages.jsx` |
| Reveal-on-scroll, Icon | `components/primitives.jsx` |
| Section / page-hero / contact-grid / contact-info-block / contact-form-block / form-success styles | `styles.css` |

## Document title and shell

- HTML `<title>`: `Sovereign AI Registry`
- TopNav active link: `Contact`
- Footer renders below the route body (bundle-dependent).
- TopNav `Log In` CTA (the v0.4 stub) navigates here, so visitors arriving from the Log In path land on this route.

## Route body — vertical layout (`ContactPage`)

1. **PageHero**
2. **Section** — 2-column `contact-grid` (`paddingTop: 40`):
   - Left: contact info block (`contact-info-block`)
   - Right: contact form block (`contact-form-block`)

There is no FilterBar, no tabs.

## Section copy and UI — PageHero (`.page-hero`)

- **Wrapper** has the standard `grid-bg` overlay (`opacity: 0.6, position: absolute, inset: 0, zIndex: 0`).
- **Inner** content (`zIndex: 1`):
  - **Crumbs** (`.crumbs`): `Contact · Talk to the operator`  
    (Unicode middle dot U+00B7.)
  - **H1** (mixed text + gradient span):
    - Plain: `Get in `
    - Gradient (`<span class="gradient-text">`): `touch`
    - Plain: `.`
  - **Subtitle** (`marginTop: 18, fontSize: 17, maxWidth: 680, color: var(--text-2)`):
    `Submit a resource, request review, report an issue, or talk to the team about standing up a registry in your jurisdiction.`

## Section copy and UI — Contact info block (left column)

Wrapped in `Reveal` (no delay). Container `.contact-info-block`. Five rows top-to-bottom:

1. **Email row** (`.contact-info-row`):
   - Icon: `<Icon name="mail" size={16}/>` in `.contact-info-icon`
   - Label (`.contact-info-label`): `Email`
   - Value (`.contact-info-value`): `hello@airegistry.mu`

2. **Operator desk row** (`.contact-info-row`):
   - Icon: `<Icon name="phone" size={16}/>`
   - Label: `Operator desk`
   - Value: `+230 460 0400`

3. **Office row** (`.contact-info-row`):
   - Icon: `<Icon name="pin" size={16}/>`
   - Label: `Office`
   - Value: `Cyber City, Ebène<br/>Republic of Mauritius`

4. **Hours block** (`paddingTop: 8, borderTop: '1px dashed var(--border)'`):
   - Label (`.contact-info-label`): `Hours`
   - Body (`fontSize: 13.5, color: var(--text-2), marginTop: 6`): `Mon–Fri · 09:00–17:30 · GMT+4`  
     (En dashes U+2013 between Mon/Fri and 09:00/17:30; middle dots U+00B7 separating the phrases.)

5. **Status block** (`paddingTop: 8`):
   - Label (`.contact-info-label`): `Status`
   - Body (inline-flex with status dot): `<span class="status-dot"></span> All systems nominal · 99.97% 90-day SLO`

## Section copy and UI — Contact form block (right column)

Wrapped in `Reveal` with `delay={120}` ms. Container `.contact-form-block`. Two states: form view and success view.

### Form view (default, `sent === false`)

- Form has `noValidate` and submits via the page-level `submit(e)` handler.
- Field structure: each `<div class="field">` (with `error` class when applicable) contains `<label>`, an input/textarea/select, and an optional `<span class="field-error">` when the field has an error.

Fields in order:

1. **Field row** (`.field-row` — 2 columns):
   - **Full name** — `<input>` placeholder `Jane Doe`. Validation: `name.trim().length >= 2`. Error message: `Name required`.
   - **Organisation** — `<input>` placeholder `Ministry of …` (Unicode horizontal ellipsis U+2026). Validation: `org.trim().length >= 2`. Error: `Organisation required`.

2. **Email** — `<input type="email">` placeholder `you@org.mu`. Validation: `/^\S+@\S+\.\S+$/`. Error: `Valid email required`.

3. **Topic** — `<select>` with six options:
   | value | label |
   |---|---|
   | `general` | `General enquiry` |
   | `submit` | `Submit a resource` |
   | `review` | `Request a review` |
   | `report` | `Report an issue` |
   | `jurisdiction` | `Standing up a registry` |
   | `press` | `Press / media` |
   Default: `general`.

4. **Message** — `<textarea>` placeholder `Tell us what you need…`. Validation: `message.trim().length >= 16`. Error: `Tell us a bit more (≥16 chars)` (Unicode `≥` U+2265).

5. **Submit row** (`display: flex, gap: 8, justifyContent: flex-end, alignItems: center, marginTop: 8`):
   - Left text (`fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: var(--text-3), marginRight: auto`): `We reply within 2 working days.`
   - Right submit button: `<button type="submit" class="btn btn-primary">Send message <Icon name="arrow-right" size={13}/></button>`

### Success view (`sent === true`)

- `<div class="form-success"><Icon name="check" size={16}/><span>Message received. We respond within 2 working days.</span></div>`
- Below: `<button class="btn btn-secondary">Send another</button>` (clears form and `sent` state).

## Mock contact info — inline in `ContactPage`

Hard-coded in `pages.jsx`. Reproduce verbatim:

| Field | Value |
|---|---|
| Email | hello@airegistry.mu |
| Operator desk | +230 460 0400 |
| Office | Cyber City, Ebène · Republic of Mauritius |
| Hours | Mon–Fri · 09:00–17:30 · GMT+4 |
| Status | All systems nominal · 99.97% 90-day SLO |

## Visual and motion

- **PageHero**: standard `grid-bg` overlay treatment.
- **Two-column grid** (`.contact-grid`): defined in `styles.css` — typically `gridTemplateColumns: '1fr 1.3fr'` or similar (left narrower than right). Collapses to single column below ~720px.
- **Reveal**: left block no delay; right block `delay={120}`.
- **Field error state**: `.field.error` adds a 1px red border on the input and shows the `<span class="field-error">` below.
- **Form success**: `.form-success` is a green-toned banner with check icon + message.
- **Button arrow**: `<Icon name="arrow-right" size={13}/>` — small inline icon at the end of `Send message`.

## Form submission flow

The prototype's `submit(e)` handler runs ALL validation client-side and on success sets `sent = true` (no actual network request). Production must:

- POST to `/public/contact` with the form payload (see `api.yaml`).
- On 202: switch to the success view.
- On 400 with field errors: re-show the form with server errors merged with client errors.
- On 5xx: keep the form open, surface a banner `Couldn't send — try again.`

A spam-resistant CAPTCHA SHOULD gate the submission server-side; the SPA may include a token (e.g. Turnstile) in the request body.

## Navigation behaviour from this page

- TopNav links navigate to other public routes via hash.
- The `Send another` button on the success view resets local state — it does NOT navigate.

## Out of scope on this page

- Live chat / chatbot — the registry is operator-staffed, not auto-answered.
- Scheduling / calendar booking — the operator desk handles outreach manually in v0.4.
- Multi-language form — English only in v0.4. The Hours line is GMT+4, the operator desk number is +230 (Mauritius), the email domain is `.mu` — all geographically anchored.
