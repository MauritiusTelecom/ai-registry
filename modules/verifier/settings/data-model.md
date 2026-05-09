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

# Verifier · Settings module — Data model

## VerifierSettings

A single per-verifier object grouped by category. The two cards on the page each bind to one nested object.

```ts
type VerifierSettings = {
  profile:     ReviewerProfile;
  preferences: QueuePreferences;
  updatedAt:   string;     // ISO-8601 UTC of last save
  updatedBy:   string;     // email of the verifier who saved (always self in v0.4)
};

type ReviewerProfile = {
  displayName:    string;     // "Sanjay Boodhoo"
  collegium:      string;     // "Sovereignty Board"
  specialisation: string;     // free-form ("legal · safety")
};

type QueuePreferences = {
  defaultStage:  'sovereignty' | 'evaluation' | 'safety';
  maxConcurrent: number;       // ≥1; verifier-chosen cap
};
```

### Field semantics

Profile:
- **`displayName`** — name shown in the user menu and audit ledger. Must match the IdP claim's display name within reason; production validates loosely.
- **`collegium`** — authority label (e.g. "Sovereignty Board", "Mauritius Eval Working Group"). Surfaces alongside the verifier email on `/decided`.
- **`specialisation`** — free-form tag list; production should converge on a closed taxonomy (`legal`, `safety`, `eval`, `policy`, `cross-border`, etc.).

Preferences:
- **`defaultStage`** — initial stage filter applied to `/queue`. v0.4 source has no `defaultValue` on the select, so the first option (`sovereignty`) is selected.
- **`maxConcurrent`** — operator-chosen cap. Routing stops assigning rows once the verifier's in-flight count reaches the cap. Production validates `1 ≤ maxConcurrent ≤ 20`.

### v0.4 mock defaults

The prototype renders the following `defaultValue` strings:

| Field | Default |
|-------|---------|
| `profile.displayName` | `Sanjay Boodhoo` |
| `profile.collegium` | `Sovereignty Board` |
| `profile.specialisation` | `legal · safety` |
| `preferences.defaultStage` | `sovereignty` (first option; no explicit defaultValue) |
| `preferences.maxConcurrent` | `4` |

The `legal · safety` default uses Unicode middle dot U+00B7 between the two specialisations.

## Authoritative response shape (production)

```ts
type VerifierSettingsResponse = VerifierSettings;

type VerifierSettingsPatch = {
  profile?:     Partial<ReviewerProfile>;
  preferences?: Partial<QueuePreferences>;
};
```

## Constraints / invariants

- `VerifierSettings` is exactly one row per `(verifier user id)`, NOT per tenant. Each verifier has their own settings.
- `displayName` change does NOT alter prior audit ledger rows; historical entries keep the prior name.
- `collegium` change must reference a known collegium membership; production rejects unknown collegium names with 422.
- `maxConcurrent` increases take effect immediately; decreases take effect on the NEXT row assignment (in-flight rows continue).
- `updatedAt` advances monotonically; production rejects PATCH with 409 if the client's last-known `updatedAt` does not match.

## Reference data on this page

- **Default stage options:** `sovereignty`, `evaluation`, `safety` (3 enum values).
- **Specialisation separator:** Unicode middle dot U+00B7.
- **Max concurrent default:** `4` is the prototype's value; production should bound `[1, 20]`.
