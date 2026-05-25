-- Resource versioning: ResourceVersion + status lookup + backfill.
-- See docs/specs/resource-versioning.md

-- ── 1. Status lookup ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ResourceVersionStatusType" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResourceVersionStatusType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResourceVersionStatusType_code_key"
    ON "registry"."ResourceVersionStatusType"("code");

INSERT INTO "registry"."ResourceVersionStatusType" ("id", "code", "name", "description", "sortOrder", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'draft',     'Draft',     'Provider is editing',                          10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'submitted', 'Submitted', 'Awaiting verifier review',                     20, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'approved',  'Approved',  'Was or is the live published version',         30, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'rejected',  'Rejected',  'Verifier did not approve - provider may edit', 40, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- ── 2. ResourceVersion table ───────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ResourceVersion" (
    "id"                    TEXT NOT NULL,
    "resourceId"            TEXT NOT NULL,
    "versionNumber"         INTEGER NOT NULL,
    "statusId"              TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "shortDescription"      TEXT NOT NULL,
    "longDescription"       TEXT,
    "accessUrl"             TEXT,
    "sourceCodeUrl"         TEXT,
    "documentationUrl"      TEXT,
    "termsUrl"              TEXT,
    "license"               TEXT,
    "versionLabel"          TEXT,
    "providerVersionNumber" TEXT,
    "latencyTier"           TEXT,
    "riskLevelId"           TEXT NOT NULL,
    "createdById"           UUID NOT NULL,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt"           TIMESTAMP(3),
    "approvedById"          UUID,
    "approvedAt"            TIMESTAMP(3),
    "rejectedById"          UUID,
    "rejectedAt"            TIMESTAMP(3),
    "decisionNote"          TEXT,
    CONSTRAINT "ResourceVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResourceVersion_resourceId_versionNumber_key"
    ON "registry"."ResourceVersion"("resourceId", "versionNumber");
CREATE INDEX IF NOT EXISTS "ResourceVersion_resourceId_idx"
    ON "registry"."ResourceVersion"("resourceId");
CREATE INDEX IF NOT EXISTS "ResourceVersion_statusId_idx"
    ON "registry"."ResourceVersion"("statusId");

ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "registry"."Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "registry"."ResourceVersionStatusType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_riskLevelId_fkey"
    FOREIGN KEY ("riskLevelId") REFERENCES "registry"."RiskLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "registry"."ResourceVersion"
    ADD CONSTRAINT "ResourceVersion_rejectedById_fkey"
    FOREIGN KEY ("rejectedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ── 3. Resource pointer columns ────────────────────────
ALTER TABLE "registry"."Resource"
    ADD COLUMN IF NOT EXISTS "currentPublishedVersionId" TEXT,
    ADD COLUMN IF NOT EXISTS "draftVersionId"            TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Resource_currentPublishedVersionId_key"
    ON "registry"."Resource"("currentPublishedVersionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Resource_draftVersionId_key"
    ON "registry"."Resource"("draftVersionId");

ALTER TABLE "registry"."Resource"
    ADD CONSTRAINT "Resource_currentPublishedVersionId_fkey"
    FOREIGN KEY ("currentPublishedVersionId") REFERENCES "registry"."ResourceVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registry"."Resource"
    ADD CONSTRAINT "Resource_draftVersionId_fkey"
    FOREIGN KEY ("draftVersionId") REFERENCES "registry"."ResourceVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 4. Backfill v1=approved for every existing Resource ───
DO $$
DECLARE
    approved_status_id TEXT;
    fallback_user_id   UUID;
BEGIN
    SELECT id INTO approved_status_id FROM "registry"."ResourceVersionStatusType" WHERE code = 'approved';

    -- Prefer an admin user; fall back to any user if none.
    SELECT u.id INTO fallback_user_id
    FROM "registry"."User" u
    JOIN "registry"."UserRoleType" r ON r.id = u."roleId"
    WHERE r.code = 'admin'
    ORDER BY u."createdAt" ASC
    LIMIT 1;

    IF fallback_user_id IS NULL THEN
        SELECT id INTO fallback_user_id FROM "registry"."User" ORDER BY "createdAt" ASC LIMIT 1;
    END IF;

    -- If there are no users at all, skip the backfill (fresh DB, no resources yet).
    IF fallback_user_id IS NOT NULL THEN
        WITH inserted AS (
            INSERT INTO "registry"."ResourceVersion" (
                "id", "resourceId", "versionNumber", "statusId",
                "title", "shortDescription", "longDescription",
                "accessUrl", "sourceCodeUrl", "documentationUrl", "termsUrl",
                "license", "versionLabel", "providerVersionNumber", "latencyTier",
                "riskLevelId", "createdById", "createdAt", "approvedById", "approvedAt"
            )
            SELECT
                gen_random_uuid()::text,
                r."id",
                1,
                approved_status_id,
                r."title", r."shortDescription", r."longDescription",
                r."accessUrl", r."sourceCodeUrl", r."documentationUrl", r."termsUrl",
                r."license", r."versionLabel", r."versionNumber", r."latencyTier",
                r."riskLevelId", fallback_user_id, COALESCE(r."listedAt", r."createdAt"),
                fallback_user_id, COALESCE(r."listedAt", r."createdAt")
            FROM "registry"."Resource" r
            WHERE r."currentPublishedVersionId" IS NULL
            RETURNING "id", "resourceId"
        )
        UPDATE "registry"."Resource" r
        SET "currentPublishedVersionId" = inserted."id"
        FROM inserted
        WHERE r."id" = inserted."resourceId";
    END IF;
END $$;
