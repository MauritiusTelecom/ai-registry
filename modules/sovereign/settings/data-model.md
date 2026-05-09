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

# Sovereign · Settings module — Data model

## SovProfile

A single tenant-scoped object. The single card on the page binds to it directly.

```ts
type SovProfile = {
  operator:         string;     // operator display name (e.g. "Marie Laurent")
  authority:        string;     // authority label (e.g. "Ministry of Finance, Republic of Mauritius")
  reportingCadence: 'weekly' | 'monthly' | 'quarterly';
  updatedAt:        string;     // ISO-8601 UTC of last save
  updatedBy:        string;     // email of the last operator who saved
};
```

### Field semantics

- **`operator`** — operator display name; surfaces in the user menu and audit ledger entries from this seat.
- **`authority`** — authority label; surfaces in the dashboard PageHeader subtitle and on national reports.
- **`reportingCadence`** — schedule for the national-report scheduler. The three values map to:
  - `weekly` — Monday morning each week
  - `monthly` — first business day of each month
  - `quarterly` — first business day of Apr / Jul / Oct / Jan

### v0.4 mock defaults

The prototype renders the following `defaultValue` strings:

| Field | Default |
|-------|---------|
| `operator` | `Marie Laurent` |
| `authority` | `Ministry of Finance, Republic of Mauritius` |
| `reportingCadence` | `weekly` (first option; no explicit defaultValue in source) |

## Authoritative response shape (production)

```ts
type SovSettingsResponse = SovProfile;

type SovSettingsPatch = Partial<Pick<SovProfile, 'operator' | 'authority' | 'reportingCadence'>>;
```

## Constraints / invariants

- `SovProfile` is exactly one row per sovereign tenant; there is no list endpoint.
- `operator` MUST match an active user with the `sovereign` role for this authority. Production must validate at save time.
- `authority` MUST match the legal authority registered at tenant onboarding; changing it post-onboarding requires the same governance process as the public charter.
- `reportingCadence` change MUST advance the next-scheduled-report timestamp; the next report respects the new cadence.
- `updatedAt` advances monotonically; production rejects PATCH with 409 if the client's last-known `updatedAt` does not match.

## Reference data on this page

- **Reporting cadence options:** `weekly`, `monthly`, `quarterly` (3 enum values).
