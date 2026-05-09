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

# Provider · Settings module — Data model

## ProviderSettings

A single provider-org-scoped object grouped by category. The two cards on the page each bind to one nested object.

```ts
type ProviderSettings = {
  organisation: OrganisationSettings;
  notifications: NotificationsSettings;
  updatedAt: string;       // ISO-8601 UTC of last save
  updatedBy: string;       // email of the last operator who saved
};

type OrganisationSettings = {
  displayName: string;     // "eduMu" (default)
  domain: string;          // "edu.gov.mu" (default; read-only post-onboarding in production)
  publicBio: string;       // public bio surfaced on /providers/{slug}
};

type NotificationsSettings = {
  incidentChannel: string; // free-form ("#edu-air-ops (Slack)")
  onCallEmail: string;     // RFC-5322 email
  webhook?: string;        // optional outbound webhook URL
};
```

### Field semantics

Organisation:
- **`displayName`** — operator-chosen display label. Surfaces on public profile, sidebar logo sub label, and portal title.
- **`domain`** — canonical web entity. **Read-only after onboarding** in production; changing it requires re-verification (DNS TXT proof or signed manifest, same flow as `/publish`).
- **`publicBio`** — short paragraph surfaced on the public profile page. Plain text only; HTML / Markdown not allowed.

Notifications:
- **`incidentChannel`** — free-form display string. The actual integration is configured at the admin level under `/integrations`; this field is the destination label visible to provider operators.
- **`onCallEmail`** — fallback notification mailbox. Production should validate as RFC-5322.
- **`webhook`** — optional. Production POSTs incident lifecycle events to this URL with HMAC signing using a shared secret rotated quarterly.

### v0.4 mock defaults

The prototype renders the following `defaultValue` strings in inputs:

| Field | Default |
|-------|---------|
| `organisation.displayName` | `eduMu` |
| `organisation.domain` | `edu.gov.mu` |
| `organisation.publicBio` | `Mauritius Ministry of Education — open educational resources, retrieval-only.` |
| `notifications.incidentChannel` | `#edu-air-ops (Slack)` |
| `notifications.onCallEmail` | `oncall@edu.gov.mu` |
| `notifications.webhook` | (placeholder `https://...`, no default) |

## Authoritative response shape (production)

```ts
type ProviderSettingsResponse = ProviderSettings;
```

Sub-PATCH endpoints accept partial bodies of each subtype:

```ts
type OrganisationSettingsPatch  = Partial<OrganisationSettings>;
type NotificationsSettingsPatch = Partial<NotificationsSettings>;
```

## Constraints / invariants

- `ProviderSettings` is exactly one row per provider tenant; there is no list endpoint.
- `organisation.domain` MUST match the verified domain established at onboarding; production rejects changes with 409 unless the operator submits new proof-of-control.
- `organisation.publicBio` MUST be ≤ 240 characters and contain no URLs, HTML, or Markdown.
- `notifications.onCallEmail` MUST validate as RFC-5322.
- `notifications.webhook`, if present, MUST be HTTPS.
- `updatedAt` advances monotonically; production rejects PATCH with 409 if the client's last-known `updatedAt` does not match.

## Reference data on this page

- **Free-form text fields** dominate this page. There are no enums to validate against.
- The em dash `—` (U+2014) appears in the prototype's `publicBio` default; production must preserve it.
