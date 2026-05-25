-- Review thread (simple ticketing on a review) + attachments.
-- See docs/specs/provider-review-thread.md

-- ── Status type lookup ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ReviewThreadStatusType" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewThreadStatusType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewThreadStatusType_code_key"
    ON "registry"."ReviewThreadStatusType"("code");

-- ── Seed the 5 status codes ──────────────────────────────
INSERT INTO "registry"."ReviewThreadStatusType" ("id", "code", "name", "description", "sortOrder", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'open',               'Open',               'Thread is open; awaiting first response',         10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'awaiting_provider',  'Awaiting provider',  'Verifier is waiting for provider response',       20, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'awaiting_verifier',  'Awaiting verifier',  'Provider has replied; verifier action pending',   30, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'resolved',           'Resolved',           'Both parties agree the issue is closed',          40, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'closed',             'Closed',             'Closed without resolution (e.g. resource withdrawn)', 50, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- ── Thread (one per review) ──────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ReviewThread" (
    "id"           TEXT NOT NULL,
    "reviewId"     TEXT NOT NULL,
    "statusId"     TEXT NOT NULL,
    "openedById"   UUID NOT NULL,
    "resolvedById" UUID,
    "resolvedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewThread_reviewId_key"
    ON "registry"."ReviewThread"("reviewId");
CREATE INDEX IF NOT EXISTS "ReviewThread_statusId_idx"
    ON "registry"."ReviewThread"("statusId");
CREATE INDEX IF NOT EXISTS "ReviewThread_openedById_idx"
    ON "registry"."ReviewThread"("openedById");

ALTER TABLE "registry"."ReviewThread"
    ADD CONSTRAINT "ReviewThread_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "registry"."Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ReviewThread"
    ADD CONSTRAINT "ReviewThread_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "registry"."ReviewThreadStatusType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registry"."ReviewThread"
    ADD CONSTRAINT "ReviewThread_openedById_fkey"
    FOREIGN KEY ("openedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "registry"."ReviewThread"
    ADD CONSTRAINT "ReviewThread_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ── Message (N per thread) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ReviewThreadMessage" (
    "id"          TEXT NOT NULL,
    "threadId"    TEXT NOT NULL,
    "authorId"    UUID NOT NULL,
    "authorRole"  TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "systemEvent" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewThreadMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReviewThreadMessage_threadId_createdAt_idx"
    ON "registry"."ReviewThreadMessage"("threadId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReviewThreadMessage_authorId_idx"
    ON "registry"."ReviewThreadMessage"("authorId");

ALTER TABLE "registry"."ReviewThreadMessage"
    ADD CONSTRAINT "ReviewThreadMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "registry"."ReviewThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ReviewThreadMessage"
    ADD CONSTRAINT "ReviewThreadMessage_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ── Attachment (N per message) ───────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."ReviewThreadAttachment" (
    "id"             TEXT NOT NULL,
    "messageId"      TEXT NOT NULL,
    "filename"       TEXT NOT NULL,
    "contentType"    TEXT NOT NULL,
    "sizeBytes"      INTEGER NOT NULL,
    "storageKey"     TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "uploadedById"   UUID NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewThreadAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewThreadAttachment_storageKey_key"
    ON "registry"."ReviewThreadAttachment"("storageKey");
CREATE INDEX IF NOT EXISTS "ReviewThreadAttachment_messageId_idx"
    ON "registry"."ReviewThreadAttachment"("messageId");

ALTER TABLE "registry"."ReviewThreadAttachment"
    ADD CONSTRAINT "ReviewThreadAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "registry"."ReviewThreadMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registry"."ReviewThreadAttachment"
    ADD CONSTRAINT "ReviewThreadAttachment_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "registry"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
