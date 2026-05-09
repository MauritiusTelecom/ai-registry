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

# Admin · Settings module — Data model

## Settings

A single tenant-scoped object grouped by category. The four cards on the page each bind to one nested object.

```ts
type Settings = {
  identity:    IdentitySettings;
  sovereignty: SovereigntySettings;
  audit:       AuditSettings;
  branding:    BrandingSettings;
  updatedAt:   string;       // ISO-8601 UTC of last save
  updatedBy:   string;       // email of the last admin who saved
};

type IdentitySettings = {
  primaryIdp:       string;                          // "gov.mu OIDC" (default)
  mfaEnforcement:   'all' | 'admin';                 // 'all' = All roles (default), 'admin' = Admins only
  sessionLifetime:  string;                          // free-form duration string ("8h" default)
};

type SovereigntySettings = {
  defaultTier:   'Tier-1' | 'Tier-2' | 'Tier-3';     // 'Tier-2' default
  egressPosture: 'blocked' | 'logged' | 'open';      // 'logged' default
  dpiaThreshold: string;                             // free-form ("any-PII" default)
};

type AuditSettings = {
  retention:           string;                       // free-form duration ("7 years" default)
  notarisationCadence: string;                       // free-form schedule ("hourly" default)
  archiveBucket:       string;                       // URI ("s3://air-audit-mu" default)
};

type BrandingSettings = {
  publicName:   string;     // "Sovereign AI Registry" default
  supportEmail: string;     // "registry@gov.mu" default
  statusPage:   string;     // hostname-only ("status.air.gov.mu" default)
};
```

### Field semantics

Identity:
- **`primaryIdp`** — display label of the bound identity provider. Production should keep this label-only and configure the actual issuer / client id / scopes via the Integrations module.
- **`mfaEnforcement`** — `all` requires MFA for every role. `admin` allows non-admin roles to skip MFA (not recommended; surfacing in v0.4 only for completeness).
- **`sessionLifetime`** — free-form duration parsed server-side (`8h`, `24h`, `30m`, `7d`, …). Production must accept ISO-8601 duration as an alternative (`PT8H`).

Sovereignty:
- **`defaultTier`** — initial `sov` value applied when an admin creates a new `Resource` without specifying a tier.
- **`egressPosture`** — three-level posture matched against `pol_egress_default`. `blocked` blocks all external calls; `logged` allows but logs every call; `open` is unconstrained (only sensible for development).
- **`dpiaThreshold`** — string matched against the resource description / classification by `pol_dpia_required`. `any-PII` triggers DPIA whenever the resource handles any personally identifiable information.

Audit:
- **`retention`** — free-form duration; production should reject values shorter than the legal floor for the tenant's jurisdiction.
- **`notarisationCadence`** — free-form schedule (`hourly`, `every 30 minutes`, `daily 02:00`, …). Production should accept cron-like expressions.
- **`archiveBucket`** — URI of the storage bucket. Must match an active `kind === 'storage'` integration; saving a value that does not match an active storage integration MUST surface an inline error.

Branding:
- **`publicName`** — surfaces on public-site footer brand line, portal sidebar logo, and status page header.
- **`supportEmail`** — surfaces on the public `#/contact` page and on every error page footer.
- **`statusPage`** — hostname only (no scheme); the `Open status page` action prepends `https://` at click time.

## v0.4 mock defaults

The prototype renders the following `defaultValue` strings in inputs / selects:

| Field | Default |
|-------|---------|
| `identity.primaryIdp` | `gov.mu OIDC` |
| `identity.mfaEnforcement` | `all` |
| `identity.sessionLifetime` | `8h` |
| `sovereignty.defaultTier` | `Tier-2` |
| `sovereignty.egressPosture` | `logged` |
| `sovereignty.dpiaThreshold` | `any-PII` |
| `audit.retention` | `7 years` |
| `audit.notarisationCadence` | `hourly` |
| `audit.archiveBucket` | `s3://air-audit-mu` |
| `branding.publicName` | `Sovereign AI Registry` |
| `branding.supportEmail` | `registry@gov.mu` |
| `branding.statusPage` | `status.air.gov.mu` |

## Authoritative response shape (production)

```ts
type AdminSettingsResponse = Settings;
```

Sub-PATCH endpoints accept partial bodies of each subtype:

```ts
type IdentitySettingsPatch    = Partial<IdentitySettings>;
type SovereigntySettingsPatch = Partial<SovereigntySettings>;
type AuditSettingsPatch       = Partial<AuditSettings>;
type BrandingSettingsPatch    = Partial<BrandingSettings>;
```

## Constraints / invariants

- `Settings` is exactly one row per tenant; there is no list endpoint.
- `audit.archiveBucket` MUST point to an integration registered under `/admin/integrations` with `kind === 'storage'` and `status !== 'revoked'`.
- `branding.supportEmail` MUST validate as a valid email; it surfaces on user-visible pages.
- `branding.statusPage` MUST validate as a valid hostname (RFC 1123); the `Open status page` flow on `/dashboard` will fail otherwise.
- A change to `identity.primaryIdp` MUST trigger a sign-out of all existing sessions on next request (handled server-side); the SPA SHOULD warn the operator before saving.

## Reference data on this page

- **Tier values:** `Tier-1`, `Tier-2`, `Tier-3` — match `Resource.sov` values.
- **Egress posture values:** `blocked`, `logged`, `open` — match the `pol_egress_default` policy parameter taxonomy.
- **MFA enforcement values:** `all`, `admin` — display labels are `All roles`, `Admins only`.
