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

# Public · Contact module — Data model

## ContactInfo (left column)

Hard-coded in `ContactPage` (`components/pages.jsx`). Production should source from a single config endpoint so the operator can edit without redeploying.

```ts
type ContactInfo = {
  email:        string;     // "hello@airegistry.mu"
  operatorDesk: string;     // "+230 460 0400"
  office:       string;     // "Cyber City, Ebène\nRepublic of Mauritius"
  hours:        string;     // "Mon–Fri · 09:00–17:30 · GMT+4"
  status: {
    operational: boolean;
    slo90d:      string;    // "99.97%"
    label:       string;    // "All systems nominal"
  };
};
```

### v0.4 mock values

| Field | Value |
|---|---|
| `email` | hello@airegistry.mu |
| `operatorDesk` | +230 460 0400 |
| `office` | Cyber City, Ebène / Republic of Mauritius (two-line display via `<br/>`) |
| `hours` | Mon–Fri · 09:00–17:30 · GMT+4 |
| `status.operational` | true |
| `status.slo90d` | 99.97% |
| `status.label` | All systems nominal |

The `Mon–Fri` and `09:00–17:30` separators are Unicode en dash U+2013. The other separators are Unicode middle dot U+00B7.

## ContactForm (right column, local React state)

```ts
type ContactForm = {
  name:    string;     // 'Full name' input
  org:     string;     // 'Organisation' input
  email:   string;     // 'Email' input
  topic:   'general' | 'submit' | 'review' | 'report' | 'jurisdiction' | 'press';
  message: string;     // 'Message' textarea
};

type ContactErrors = Partial<Record<keyof ContactForm, string>>;
```

Initial state at mount:

```json
{ "name": "", "org": "", "email": "", "topic": "general", "message": "" }
```

`errors` initial state: `{}` (empty object).

`sent` flag (boolean) determines which view renders: `false` → form view, `true` → success view.

## Topic options (in order)

| value | label |
|---|---|
| `general` | General enquiry |
| `submit` | Submit a resource |
| `review` | Request a review |
| `report` | Report an issue |
| `jurisdiction` | Standing up a registry |
| `press` | Press / media |

Default selection: `general`.

## Validation rules

| Field | Rule | Error message |
|---|---|---|
| `name` | `name.trim().length >= 2` | `Name required` |
| `org` | `org.trim().length >= 2` | `Organisation required` |
| `email` | `/^\S+@\S+\.\S+$/` | `Valid email required` |
| `topic` | always present (default value) | (no error) |
| `message` | `message.trim().length >= 16` | `Tell us a bit more (≥16 chars)` |

The `≥` in the message error is Unicode `≥` U+2265. The `…` in the Organisation placeholder is Unicode horizontal ellipsis U+2026.

## ContactSubmission (production wire shape)

```ts
type ContactSubmission = ContactForm & {
  captchaToken?: string;     // production: Turnstile / hCaptcha token
};

type ContactSubmissionResponse = {
  ticketId: string;          // server-issued
  acknowledgedAt: string;    // ISO-8601 UTC
};
```

## Constraints / invariants

- The `topic` enum drives downstream routing: `submit` and `review` go to the review board; `report` goes to the safety / governance team; `general`, `jurisdiction`, `press` go to the operator desk.
- The form is **stateless on the client** between sessions — closing the tab loses any unsent draft. Production may add `localStorage` persistence keyed by an anonymous draft id.
- The success view does NOT echo any of the submitted data back into the SPA — only the standard "Message received" copy.
- Email field MUST validate as RFC-5322 in production (the prototype uses a permissive regex).

## Reference data on this page

- **Email link**: production should wrap `email` in `<a href="mailto:hello@airegistry.mu">…</a>`.
- **Phone link**: production should wrap `operatorDesk` in `<a href="tel:+2304600400">…</a>`.
- **Status**: feeds from `/public/site-config` in production; see `modules/public/home/api.yaml` for the canonical shape.
