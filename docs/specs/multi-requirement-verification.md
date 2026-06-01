# Spec - Multi-requirement provider verification

**Status:** Draft for implementation
**Author:** AI Registry team
**Date:** 2026-06-01

---

## 1. Goal

Generalise provider verification so that any country **and** any sector can stack verification gates without modifying core.

Today (v0.1) the platform has a single hardcoded `Provider.brnVerifiedAt` column and a single `"MU"` jurisdiction check in `provider-queries.ts`. That works for the demo but breaks the moment a second requirement is added (e.g., Bank of Mauritius licence for banking-sector providers).

After (v0.2):

- A Mauritius **banking** AI provider needs **BRN ✓** + **BoM licence ✓**.
- A Mauritius **health** AI provider needs **BRN ✓** + **MoH permit ✓**.
- A Rwanda provider needs **RDB ✓** (their own extension).
- An EU provider needs **VAT-ID ✓** + **GDPR self-assessment ✓**.

All composable. No core change required to add a new requirement.

---

## 2. Data model

### 2.1 New table `ProviderVerification`

```prisma
model ProviderVerification {
  id            String   @id @default(uuid())
  providerId    String
  // Reverse-DNS id of the extension that owns this requirement,
  // e.g. "mu-brn-check", "mu-bom-banking-license", "rw-rdb-check".
  extensionId   String
  // Stable code within the extension. Most extensions contribute a
  // single requirement (code "brn"); some contribute several.
  requirementCode String
  // Display label rendered in admin queues + provider settings.
  // Stored on the row so admin UI doesn't need to ask the extension.
  label         String
  // What kind of provider doc class should the verifier look at? Hint
  // only - the actual link lives in ProviderDocument via documentType.
  documentTypeHint String?

  verifiedAt    DateTime?
  verifiedById  String?  @db.Uuid
  rejectionNote String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  provider      Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  verifiedBy    User?    @relation("ProviderVerificationVerifiedBy", fields: [verifiedById], references: [id])

  @@unique([providerId, extensionId, requirementCode])
  @@index([providerId])
  @@index([extensionId])
  @@index([verifiedAt])
  @@schema("registry")
}
```

### 2.2 Columns dropped from `Provider`

- `brnVerifiedAt` -> replaced by a `ProviderVerification` row with `extensionId="mu-brn-check"`, `requirementCode="brn"`
- `brnVerifiedById` -> same
- `brnVerificationNote` -> same (split into note-on-verify + note-on-reject)

Migration backfills the existing rows.

---

## 3. Extension manifest contract

Each extension's `airegistry-plugin.json` may declare a new optional block:

```json
{
  "id": "mu-bom-banking-license",
  "name": "Mauritius Bank of Mauritius licence check",
  "verificationRequirements": [
    {
      "code": "bom-license",
      "label": "Bank of Mauritius licence",
      "appliesWhen": {
        "providerJurisdiction": ["MU"],
        "providerSectors": ["finance", "banking", "insurance"]
      },
      "documentTypeHint": "compliance_bom"
    }
  ]
}
```

Applicability rules (`appliesWhen`):

| field | meaning | match rule |
|---|---|---|
| `providerJurisdiction` | Array of jurisdiction codes ("MU", "RW", ...) | OR within the array; required if present |
| `providerSectors` | Array of sector codes ("finance", "health", ...) | OR within the array; required if present (provider has ≥1 resource in any of these sectors OR provider declares the sector at org level) |
| `providerKinds` | Array of provider-type codes ("sovereign_operator", "private", ...) | OR within the array |

All conditions are AND-combined. Omitting a field means "any". An empty `appliesWhen: {}` means "every provider".

`mu-brn-check` declares `providerJurisdiction: ["MU"]` and nothing else - applies to every MU provider regardless of sector.

`mu-bom-banking-license` adds the sector filter.

---

## 4. The applicability matrix

At plugin-load time, the platform builds:

```
extensionId.requirementCode -> appliesWhen rules
```

For any given provider, the platform computes the **set of applicable requirements**:

```ts
applicableRequirements(provider): Array<{ extensionId, requirementCode, label, documentTypeHint }>
```

A provider's `ProviderVerification` rows fill or fail to fill those slots. If a requirement is applicable but no row exists, the requirement is *missing*. If a row exists but `verifiedAt` is null, it's *pending*. If `verifiedAt` is set, it's *verified*.

---

## 5. Visibility gate

A provider is publicly listed **iff** every applicable requirement has `verifiedAt != null`.

In `buildProviderWhere`, this becomes:

```ts
// Pseudocode
{
  AND: [
    { published: true, adminSuspended: false },
    // For each requirement extension, AND-in a clause that says
    // "either this requirement doesn't apply to this provider, OR
    // there is a verified ProviderVerification row for it".
    ...applicableRequirementClauses
  ]
}
```

Implementation: load all applicable requirements upfront (rare update, cache in memory), then convert each into a `OR { applicable: false }, { verifications: { some: { extensionId, requirementCode, verifiedAt: { not: null } } } }` clause.

For listing pages this is a small overhead; we can also denormalise into a `Provider.fullyVerifiedAt` cache column for hot paths if it ever becomes a bottleneck. Out of scope for v0.2.

---

## 6. Admin surface

### 6.1 `/admin/verifications` (replaces `/admin/brn-pending`)

A unified queue:

- Filter by extension (BRN, BoM, MoH, ...) and jurisdiction
- Each row = one pending `ProviderVerification` requirement
- Shows: provider name, requirement label, documents the provider has uploaded that match the `documentTypeHint`, age
- Actions: **Verify** / **Reject** with a note

### 6.2 Generic admin API

```
POST /api/admin/verifications/[id]/verify  { note?: string }
POST /api/admin/verifications/[id]/reject  { note: string }
```

The id is `ProviderVerification.id`. Admin-only. The extension owning the requirement is informational; the action is centralised.

---

## 7. Provider surface

### 7.1 `/provider/settings` - "Verification status" card

A small panel (replaces the BRN-only one) listing every applicable requirement for the provider, with pills:

- ✅ Verified (date, verifier name)
- 🟡 Pending verification (created date)
- ⚠ Missing (no row created yet; system creates lazily on next page load)
- ❌ Rejected (with the verifier's note + a Resubmit button)

### 7.2 Auto-creation of `ProviderVerification` rows

When a provider opens settings (or on registration), the platform diffs their **applicable** requirements against existing `ProviderVerification` rows and creates pending rows for any that are missing. Idempotent.

---

## 8. Migration of v0.1 data

1. Create `ProviderVerification` table
2. For every Provider row with `brnVerifiedAt != null`:
   - Insert a row: `extensionId="mu-brn-check"`, `requirementCode="brn"`, `verifiedAt=Provider.brnVerifiedAt`, `verifiedById=Provider.brnVerifiedById`
3. Drop `brnVerifiedAt`, `brnVerifiedById`, `brnVerificationNote` columns from Provider

The backfill keeps every grandfathered MT provider visible.

---

## 9. Refactored mu-brn-check extension

- Manifest gains:

  ```json
  "verificationRequirements": [
    {
      "code": "brn",
      "label": "Business Registration Number (Mauritius)",
      "appliesWhen": { "providerJurisdiction": ["MU"] },
      "documentTypeHint": "company_registration"
    }
  ]
  ```

- Drop the BRN-specific service layer (`packages/core/src/lib/services/brn-verification.ts`); replaced by the generic verification service
- Drop the BRN-specific admin API routes; the generic API handles it
- Keep the format-check REST handler at `/api/ext/mu-brn-check/validate` (still useful for provider-side input feedback)
- Keep the provider-settings UI panel BUT have it now read from the generic verification model

## 10. New extension: mu-bom-banking-license (proof point)

To prove the model works:

- New folder `extensions/mauritius-bom-banking-license/`
- Manifest declares the BoM requirement (sector-gated)
- Format check (BoM licences are e.g. NBL-XXXX format - happy to use a stub)
- No UI slot needed (the provider-settings card is rendered generically by core)
- Banking-sector providers in MU now need both BRN ✓ and BoM ✓ before going public

## 11. Acceptance criteria

1. ✅ Schema migration creates `ProviderVerification` and backfills MT's existing brnVerifiedAt
2. ✅ `mu-brn-check` extension manifest declares its requirement; the BRN-pending admin page is replaced by `/admin/verifications`
3. ✅ `mu-bom-banking-license` extension exists with its requirement declared (sector-gated)
4. ✅ Public visibility gate uses the new model; MT stays publicly visible after deploy (grandfather works)
5. ✅ A new banking provider signing up sees both "BRN" and "BoM licence" as pending requirements on their settings page
6. ✅ Admin can verify or reject each requirement independently via `/admin/verifications`
7. ✅ Typecheck + build pass
8. ✅ `docs/operator-guides/country-fork.md` shows how Rwanda would write `rw-rdb-check` without touching core

---

## 12. Out of scope (v0.3 and later)

- Resource-level requirements (different AI solutions in the same provider needing different gates)
- Time-bounded requirements (re-verify every N months)
- Workflow / state machine (e.g., "requested", "evidence-submitted", "in-review")
- Federated verification (Rwanda accepts a Mauritius RDB-verified provider without re-checking)
