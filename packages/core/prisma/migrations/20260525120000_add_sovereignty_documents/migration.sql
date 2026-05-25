-- Sovereignty documents: provider-level docs + file fields on resource evidence.
-- See docs/specs/sovereignty-documents.md

-- ── 1. ProviderDocumentType lookup ──────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ProviderDocumentType" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderDocumentType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderDocumentType_code_key"
    ON "registry"."ProviderDocumentType"("code");

-- Seed the 6 default codes
INSERT INTO "registry"."ProviderDocumentType" ("id", "code", "name", "description", "sortOrder", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'company_registration',  'Company registration certificate', 'BRN / incorporation document',                10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'authorised_signatory',  'Authorised signatory proof',       'Letter / mandate from the company',           20, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'compliance_iso27001',   'ISO 27001 certification',          'Information security management',             30, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'compliance_soc2',       'SOC 2 attestation',                'Service Organization Control 2 report',       40, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'tax_standing',          'Tax / regulatory standing',        'Tax clearance or equivalent regulatory proof', 50, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'other',                 'Other supporting document',        'Anything not covered by the codes above',     90, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- ── 2. ProviderDocument ────────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ProviderDocument" (
    "id"               TEXT NOT NULL,
    "providerId"       TEXT NOT NULL,
    "documentTypeId"   TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "description"      TEXT,
    "fileStorageKey"   TEXT NOT NULL,
    "filename"         TEXT NOT NULL,
    "contentType"      TEXT NOT NULL,
    "sizeBytes"        INTEGER NOT NULL,
    "checksumSha256"   TEXT NOT NULL,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt"        TIMESTAMP(3),
    "uploadedById"     UUID NOT NULL,
    "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderDocument_fileStorageKey_key"
    ON "registry"."ProviderDocument"("fileStorageKey");
CREATE INDEX IF NOT EXISTS "ProviderDocument_providerId_idx"
    ON "registry"."ProviderDocument"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderDocument_documentTypeId_idx"
    ON "registry"."ProviderDocument"("documentTypeId");
CREATE INDEX IF NOT EXISTS "ProviderDocument_publicVisibility_idx"
    ON "registry"."ProviderDocument"("publicVisibility");

ALTER TABLE "registry"."ProviderDocument"
    ADD CONSTRAINT "ProviderDocument_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "registry"."Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ProviderDocument"
    ADD CONSTRAINT "ProviderDocument_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "registry"."ProviderDocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registry"."ProviderDocument"
    ADD CONSTRAINT "ProviderDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ── 3. File fields on SovereigntyEvidence ───────────────
ALTER TABLE "registry"."SovereigntyEvidence"
    ADD COLUMN IF NOT EXISTS "fileStorageKey"     TEXT,
    ADD COLUMN IF NOT EXISTS "fileFilename"       TEXT,
    ADD COLUMN IF NOT EXISTS "fileContentType"    TEXT,
    ADD COLUMN IF NOT EXISTS "fileSizeBytes"      INTEGER,
    ADD COLUMN IF NOT EXISTS "fileChecksumSha256" TEXT,
    ADD COLUMN IF NOT EXISTS "fileUploadedAt"     TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "SovereigntyEvidence_fileStorageKey_key"
    ON "registry"."SovereigntyEvidence"("fileStorageKey");
