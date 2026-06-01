-- Multi-requirement provider verification.
-- See docs/specs/multi-requirement-verification.md
--
-- 1. Create the ProviderVerification table
-- 2. Backfill: for every Provider with brnVerifiedAt != NULL, create a
--    ProviderVerification row for the BRN extension
-- 3. Drop the old Provider.brn* columns

CREATE TABLE IF NOT EXISTS "registry"."ProviderVerification" (
    "id"              TEXT NOT NULL,
    "providerId"      TEXT NOT NULL,
    "extensionId"     TEXT NOT NULL,
    "requirementCode" TEXT NOT NULL,
    "label"           TEXT NOT NULL,
    "documentTypeHint" TEXT,
    "verifiedAt"      TIMESTAMP(3),
    "verifiedById"    UUID,
    "rejectionNote"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderVerification_providerId_extensionId_requirementCode_key"
    ON "registry"."ProviderVerification"("providerId", "extensionId", "requirementCode");
CREATE INDEX IF NOT EXISTS "ProviderVerification_providerId_idx"
    ON "registry"."ProviderVerification"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderVerification_extensionId_idx"
    ON "registry"."ProviderVerification"("extensionId");
CREATE INDEX IF NOT EXISTS "ProviderVerification_verifiedAt_idx"
    ON "registry"."ProviderVerification"("verifiedAt");

ALTER TABLE "registry"."ProviderVerification"
    ADD CONSTRAINT "ProviderVerification_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "registry"."Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ProviderVerification"
    ADD CONSTRAINT "ProviderVerification_verifiedById_fkey"
    FOREIGN KEY ("verifiedById") REFERENCES "registry"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: convert existing brnVerifiedAt rows into ProviderVerification rows
INSERT INTO "registry"."ProviderVerification" (
    "id", "providerId", "extensionId", "requirementCode", "label",
    "documentTypeHint", "verifiedAt", "verifiedById", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    p."id",
    'mu-brn-check',
    'brn',
    'Business Registration Number (Mauritius)',
    'company_registration',
    p."brnVerifiedAt",
    p."brnVerifiedById",
    COALESCE(p."brnVerifiedAt", p."createdAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "registry"."Provider" p
WHERE p."brnVerifiedAt" IS NOT NULL
ON CONFLICT ("providerId", "extensionId", "requirementCode") DO NOTHING;

-- Drop the old Provider.brn* columns
ALTER TABLE "registry"."Provider" DROP CONSTRAINT IF EXISTS "Provider_brnVerifiedById_fkey";
DROP INDEX IF EXISTS "registry"."Provider_brnVerifiedAt_idx";
ALTER TABLE "registry"."Provider"
    DROP COLUMN IF EXISTS "brnVerifiedAt",
    DROP COLUMN IF EXISTS "brnVerifiedById",
    DROP COLUMN IF EXISTS "brnVerificationNote";
