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

# Provider · Publish module — Data model

## PublishDraft

The form state for the 5-step wizard. Production must persist drafts so a provider can resume across sessions; the prototype renders uncontrolled inputs only.

```ts
type PublishDraft = {
  id: string;          // "draft_<digits>"; opaque server-issued
  providerId: string;  // session-derived, never editable
  step: 1 | 2 | 3 | 4 | 5;       // last step the provider reached
  manifest:    ManifestStep;
  endpoint:    EndpointStep;
  verification?: VerificationStep;     // optional until step 3 reached
  sovereignty?:  SovereigntyStep;      // optional until step 4 reached
  confirm?:      ConfirmStep;          // optional until step 5 reached
  createdAt: string;   // ISO-8601 UTC
  updatedAt: string;   // ISO-8601 UTC
  // The draft is owned by exactly one provider tenant and one operator;
  // re-opening from another seat shows it as read-only.
};
```

### Step 1 — `ManifestStep`

```ts
type ManifestStep = {
  slug: string;        // e.g. "mcp/your-server"; must match kind prefix
  kind: 'mcp-server' | 'agent' | 'tool' | 'model';
  description: string; // free-form; min 12 chars on submit
  sov: 'Tier-1' | 'Tier-2' | 'Tier-3';
  region: string;      // free-form code or composite ("MU", "MU/FR", "GLOBAL")
};
```

Defaults rendered in the prototype:

| Field | Default |
|-------|---------|
| `kind` | `mcp-server` |
| `sov` | `Tier-1` |
| `region` | `MU` |

Placeholders rendered (no default; empty string until typed):

| Field | Placeholder |
|-------|-------------|
| `slug` | `mcp/your-server` |
| `description` | `One-paragraph description; what it does, who it's for, who shouldn't use it.` |

### Step 2 — `EndpointStep`

```ts
type EndpointStep = {
  url: string;             // HTTPS URL of the resource endpoint
  authMethod: 'OIDC' | 'HMAC' | 'mTLS';
  healthProbe: string;     // path under `url`, e.g. "/healthz"
};
```

Defaults rendered:

| Field | Default |
|-------|---------|
| `authMethod` | first option (`OIDC`) — no explicit `defaultValue` in source |
| `healthProbe` | `/healthz` |

Placeholders rendered:

| Field | Placeholder |
|-------|-------------|
| `url` | `https://mcp.edu.gov.mu/` |

### Step 3 — `VerificationStep` (production)

```ts
type VerificationStep = {
  proofChannel:    'dns-txt' | 'signed-manifest' | 'https-callback';
  challengeToken:  string;       // server-issued
  proofVerifiedAt: string | null; // server fills on success
  evalsNote:       string;       // pointer to eval harness output / runs
};
```

### Step 4 — `SovereigntyStep` (production)

```ts
type SovereigntyStep = {
  dpiaThreshold:    'none' | 'any-PII' | 'bulk-PII' | 'restricted';
  jurisdictionNote: string;
  attestations: {
    antiMisuse: boolean;
    ageGate:    boolean;       // optional flag depending on resource kind
    ip:         boolean;
    license:    boolean;
  };
};
```

`dpiaThreshold` default value is the tenant's `Settings → Sovereignty defaults → DPIA threshold` (e.g. `any-PII`).

### Step 5 — `ConfirmStep` (production)

```ts
type ConfirmStep = {
  diffApproved:  boolean;        // operator acknowledged diff vs prior version
  publicVersion: string;         // SemVer the new version will be assigned (server-suggested)
};
```

## Validation (`Run local checks`)

Validation runs client-side before submission. Allowed local checks:

| Check | Rule |
|-------|------|
| `slug.format` | Matches `[a-z0-9-]+/[a-z0-9-]+` (kind prefix + name). |
| `slug.kind_match` | First segment matches `kind` (`mcp` for `mcp-server`, `agent` for `agent`, `tool` for `tool`, `model` for `model`). |
| `description.length` | ≥12 chars. |
| `endpoint.url` | RFC-3986 absolute URL with scheme `https`. |
| `endpoint.healthProbe` | Starts with `/`. |
| `region.format` | Matches `[A-Z]{2}(/[A-Z]{2,8})?` for ISO-3166-α2 + composite (`MU`, `MU/FR`, `GLOBAL` is special-cased). |
| `verification.proof.fresh` | The `challengeToken` is unexpired (server-side). |

The `Run local checks` button collects results and surfaces an inline panel — green check or red error per item. It does NOT submit.

## Server-issued IDs

- `draft.id` — created on first `Save draft`.
- `verification.challengeToken` — created when the operator advances to step 3.
- After successful submit (step 5), the server allocates a `Resource.id` and the draft transitions to a published `Resource` (or new version of existing).

## Constraints / invariants

- A draft belongs to exactly one provider; cross-provider import / fork is **not** supported in v0.4.
- Re-publishing the **same SemVer** (`version`) for an existing slug is rejected with 409.
- `slug` is unique per tenant (NOT per provider — across all of a sovereign tenant's catalogue).
- Submission requires every step to be complete; partial submission with empty steps 3–5 is rejected with 422.

## Reference data on this page

- **Kind options:** `mcp-server`, `agent`, `tool`, `model` (display labels === values).
- **Sovereignty tier options:** `Tier-1`, `Tier-2`, `Tier-3` (the 4th canonical tier `Restricted` is NOT offered to providers — admins set it manually post-review).
- **Auth method options:** `OIDC`, `HMAC`, `mTLS`.
