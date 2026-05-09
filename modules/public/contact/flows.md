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

# Public · Contact module — Flows

## Routing

- Route lives at `#/contact` of the public site hash router.
- Activated by:
  - TopNav `Contact` link.
  - TopNav `Log In` CTA (v0.4 stub).
  - Hero / Promo / FAQ "still have questions" link (Bundle B Footer).
  - Bundle B `Promo` `Submit a Resource` CTA.
  - Cross-portal links (e.g. provider org's planned "contact registry" link).
- Active match: `route === 'contact'`.

## Initial render

1. App resolves `route === 'contact'` → renders `<ContactPage/>`.
2. PageHero paints synchronously.
3. The 2-column section mounts:
   - Left contact-info-block inside `Reveal` (no delay).
   - Right contact-form-block inside `Reveal` with `delay={120}` ms.
4. Form local state initialises: `form = { name:'', org:'', email:'', topic:'general', message:'' }`, `errors = {}`, `sent = false`.
5. Production: emit `public.contact.viewed` after first paint, with optional `fromCta` param if the visitor arrived from a known CTA.

## Field interaction flows

### Flow 1 — Field input

- Each input/textarea fires `setForm(f => ({...f, [k]: e.target.value}))` on change.
- The `set(k)` helper closes over the field key.
- Errors are NOT cleared per keystroke — they persist until the next submit attempt.
- Production: emit `public.contact.field.changed` (debounced 500ms) per field.

### Flow 2 — Topic select

- Same flow as Flow 1 with `k = 'topic'`.
- Emit a separate `public.contact.topic.changed` event with `from` and `to` so the operator can analyse intent shifts.

## Submit flow

### Flow 3 — Submit click

- User clicks `Send message` (form `<button type="submit">`).
- Browser fires `submit` → page-level `submit(e)` handler runs.
- `e.preventDefault()` to suppress native navigation.
- Validation runs (see `data-model.md` for rules):
  - `name.trim().length < 2` → `errs.name = 'Name required'`
  - `org.trim().length < 2` → `errs.org = 'Organisation required'`
  - `!/^\S+@\S+\.\S+$/.test(email)` → `errs.email = 'Valid email required'`
  - `message.trim().length < 16` → `errs.message = 'Tell us a bit more (≥16 chars)'`
- `setErrors(errs)`.
- If `Object.keys(errs).length > 0`: stop. The form re-renders with `.error` class on each invalid field and `<span class="field-error">` showing the error text.
- Else: `setSent(true)`. The form view unmounts and the success view renders.
- Production: instead of `setSent(true)` directly, POST to `/public/contact` first; switch to success only on 202.
- Emit `public.contact.submit.clicked` on click; `public.contact.submit.validation_failed` on validation errors with `fields` listing the failed keys; `public.contact.submit.succeeded` on 202; `public.contact.submit.failed` on non-2xx.

### Flow 4 — Server validation merge (production)

- If POST returns 400 with a `Problem.errors` object, merge those errors with the client errors (server takes precedence per field).
- If POST returns 429 (rate-limited), surface a banner `Too many submissions — try again in a minute.` and keep the form intact.
- If POST returns 5xx, surface a banner `Couldn't send — try again.` and keep the form intact.

## Success view flow

### Flow 5 — Send another

- Click `Send another` (`btn-secondary`) on the success view.
- Handler: `setSent(false); setForm({ name:'', org:'', email:'', topic:'general', message:'' });`
- The success view unmounts and the form view renders fresh.
- Errors are NOT explicitly cleared in source but are stale once the form is fresh; production should also `setErrors({})` for clarity.
- Emit `public.contact.send_another.clicked`.

## Auto-refresh

- Prototype: none.
- Production-recommended: cache `/public/contact-info` for 1 hour at the CDN edge. The contact info changes rarely.

## Error and empty states

- **GET /public/contact-info fails** (production-fetched mode): render the page with the inline v0.4 fallback values (operator should keep them as a hardcoded fallback).
- **POST /public/contact fails**: see Flow 4.
- **JavaScript disabled**: production must serve a static fallback HTML containing the contact info; the form should degrade to a `mailto:hello@airegistry.mu` link with the topic in the subject line.

## Anti-spam

- Production MUST add CAPTCHA (Turnstile or hCaptcha) and a rate-limiter at the gateway.
- Honeypot fields (invisible to humans, filled by bots) MAY be added.
- The submission rate per source IP should be capped at e.g. 5/hour.

## Accessibility

- The PageHero `<h1>` is the page heading.
- Each `<div class="field">` should associate `<label>` with the input via `for`/`id` (the prototype uses bare `<label>` tags; production must add the binding).
- Field errors should expose `aria-invalid="true"` on the input AND `aria-describedby="${id}-error"` referencing the `<span class="field-error">`.
- The success view should be a live region (`role="status" aria-live="polite"`) so screen readers announce the success without losing focus.
- The submit button MUST disable on the second click to prevent double-submission (production improvement).

## Cross-portal cross-references

- A submission with `topic === 'submit'` translates to a record in admin's onboarding queue (`modules/admin/providers/api.yaml`'s `/admin/providers/onboarding-queue` endpoint).
- A submission with `topic === 'review'` may translate to a record in admin's review queue (`modules/admin/reviews`).
- A submission with `topic === 'report'` translates to a record in admin's flags (`modules/admin/flags`).
- Press / jurisdiction / general submissions go to the operator desk inbox (out of scope here).
