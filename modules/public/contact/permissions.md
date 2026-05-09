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

# Public · Contact module — Permissions and access

## Surface classification

The public `/contact` route is **unauthenticated public content** with one **write surface** (the contact form). Anyone can submit a contact form; submissions go to the operator desk inbox via `/public/contact`.

## Authentication binding

There is **no required authentication** to view this route or to submit the form. The TopNav `Log In` CTA in v0.4 actually navigates HERE — so the route must remain functional for visitors who arrived from a sign-in intent.

Production: when real auth ships, `Log In` should route to a sign-in page; this `Contact` route stays as the public outreach surface.

## Per-element gating

| UI element | Required role | Notes |
|------------|---------------|-------|
| PageHero (crumbs / title / subtitle) | none | Public copy. |
| Contact info block (email / phone / office / hours / status) | none | Public, operator-curated copy. |
| Form fields (name / org / email / topic / message) | none | Anonymous; submitted with email-as-identifier. |
| Submit button | none | Subject to anti-spam (CAPTCHA + rate-limit). |
| Success view + 'Send another' button | none | Local UI state only. |

## Anonymous-visitor data handling

- The form collects PII (name, organisation, email, free-form message). Production must:
  - Validate input server-side (NEVER trust client-side validation alone).
  - Store the submission in a tenant-scoped CRM / ticket queue with PII at rest encrypted.
  - Issue a `ticketId` to the user without echoing the PII back into the response.
  - Run the message body through the same DLP scan that admin uses on resource bodies.
  - Never log the email or message in plain text in telemetry.
- Telemetry events (`events.json`) MUST NOT include any field values — only the field NAMES that changed / failed validation.

## Anti-spam

- Production MUST add CAPTCHA (Turnstile or hCaptcha) and a rate-limiter.
- Honeypot fields (invisible to humans, bait for bots) MAY be added.
- Per-source-IP submission rate cap: e.g. 5/hour.
- Repeat-submission throttling on (email + topic) tuples: 1/hour.

## Audit obligations

- Reading the contact page writes nothing to the audit ledger.
- A successful submission writes `contact.submission.received` to the immutable audit ledger (server-side; not visible publicly), capturing only `topic`, `ticketId`, source IP hash, and timestamp — NEVER the message body or email.
- The downstream ticket lifecycle (assignment, response, close) writes its own audit rows in the operator-desk module (out of scope here).

## Negative cases

- **Validation error**: page stays on the form view with `.field.error` markers; Submit button remains active.
- **Rate-limited (429)**: page stays on the form view with a banner `Too many submissions — try again in a minute.`
- **Server error (5xx)**: page stays on the form view with a banner `Couldn't send — try again.` Form data is preserved.
- **JavaScript disabled**: production must serve a static fallback HTML containing the contact info; the form should degrade to a `mailto:hello@airegistry.mu?subject=…&body=…` link encoded with the topic.

## Data residency

- The contact-info payload is identical in every region.
- Form submissions are written to the **canonical sovereign tenant's** ticket queue. There is no cross-tenant routing on the public site (a press enquiry from London still goes to the Mauritius operator desk).
- PII at rest follows the tenant's privacy policy; production must ensure the operator's CRM is hosted in the tenant's region.

## Content moderation

- The contact info is **operator-curated**. Production must not allow the contact info to change without the same operator authority that maintains the rest of the public site.
- Submitted messages are NEVER surfaced publicly; they go to the operator desk inbox. There is no public comments / reviews surface on this page.
