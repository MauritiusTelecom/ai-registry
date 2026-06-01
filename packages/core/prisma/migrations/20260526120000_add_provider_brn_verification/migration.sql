-- Mauritius BRN verification on Provider.
-- See extensions/mauritius-brn-check + docs/specs/... (mu-brn-check).
-- Grandfather rule: every existing Provider is marked verified at migration
-- time so they stay visible on the public site. New providers go through
-- the manual review flow.

ALTER TABLE "registry"."Provider"
    ADD COLUMN IF NOT EXISTS "brnVerifiedAt"       TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "brnVerifiedById"     UUID,
    ADD COLUMN IF NOT EXISTS "brnVerificationNote" TEXT;

CREATE INDEX IF NOT EXISTS "Provider_brnVerifiedAt_idx"
    ON "registry"."Provider"("brnVerifiedAt");

ALTER TABLE "registry"."Provider"
    ADD CONSTRAINT "Provider_brnVerifiedById_fkey"
    FOREIGN KEY ("brnVerifiedById") REFERENCES "registry"."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Grandfather every existing Provider. Without this they would vanish
-- from the public catalog the moment the visibility filter ships.
UPDATE "registry"."Provider"
SET "brnVerifiedAt" = COALESCE("brnVerifiedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "brnVerifiedAt" IS NULL;
