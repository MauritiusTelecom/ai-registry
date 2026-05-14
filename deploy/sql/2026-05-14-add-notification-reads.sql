--
-- Hand-runnable prod-DB migration for the portal-header notification bell.
-- Idempotent: every statement uses IF NOT EXISTS, so re-running is a no-op.
--
-- WHAT THIS DOES
-- ──────────────
-- Adds the `registry.NotificationRead` table so the bell's per-item dismiss
-- and "Mark all read" actions persist per user. Without this table, every
-- page reload re-derives notifications as unread and the read affordance
-- is misleading.
--
-- The table is keyed by:
--   userId          (UUID, FK -> registry."User"(id), ON DELETE CASCADE)
--   notificationKey (TEXT)  -- the stable string id minted by
--                              loadPortalNotifications, e.g.
--                              "review:<uuid>", "complaint:<uuid>",
--                              "decision:<uuid>", "admin:reviews", etc.
--
-- A composite unique constraint on (userId, notificationKey) dedupes the
-- common race where two tabs mark the same id read in the same second.
-- Two helper indexes back the typical query shapes:
--   - per-user lookup (SELECT keys for the current session) → userId index
--   - cleanup / GC of old rows (DELETE WHERE readAt < now()-90d) → readAt
--
-- HOW TO RUN
-- ──────────
-- The standard deploy path picks this up automatically via:
--
--   npx prisma migrate deploy
--
-- which executes the equivalent file under
-- src/prisma/migrations/20260514120000_add_notification_reads/migration.sql.
--
-- If you'd rather apply by hand (e.g. running directly against the prod
-- replica), connect with psql and run this file end-to-end:
--
--   psql "$DATABASE_URL" -f deploy/sql/2026-05-14-add-notification-reads.sql
--
-- POST-RUN VERIFY
-- ───────────────
--   SELECT to_regclass('registry."NotificationRead"');   -- expect: registry."NotificationRead"
--   \d "registry"."NotificationRead"
--
-- ROLLBACK
-- ────────
--   DROP TABLE IF EXISTS "registry"."NotificationRead";
-- (no data loss outside the read-receipts surface itself — the underlying
--  reviews/complaints/decisions are unaffected.)
--

BEGIN;

-- Safety: ensure the schema exists. Should already on every environment that
-- ran the original Prisma bootstrap, but the CREATE IF NOT EXISTS lets us
-- run this on a freshly-restored DB without surprises.
CREATE SCHEMA IF NOT EXISTS "registry";

-- ── Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "registry"."NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- ── Composite unique (dedupe + the natural lookup key) ───────────────
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_userId_notificationKey_key"
    ON "registry"."NotificationRead" ("userId", "notificationKey");

-- ── Supporting indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "NotificationRead_userId_idx"
    ON "registry"."NotificationRead" ("userId");

CREATE INDEX IF NOT EXISTS "NotificationRead_readAt_idx"
    ON "registry"."NotificationRead" ("readAt");

-- ── Foreign key (idempotent guard around ADD CONSTRAINT) ─────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
          JOIN pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
         WHERE pg_namespace.nspname = 'registry'
           AND conname = 'NotificationRead_userId_fkey'
    ) THEN
        ALTER TABLE "registry"."NotificationRead"
            ADD CONSTRAINT "NotificationRead_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "registry"."User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;

-- ── Optional: light-touch GC suggestion (NOT executed) ────────────────
-- A long-running provider will accumulate rows for long-since-resolved
-- reviews and complaints. Either schedule the following as a nightly job
-- or run on demand. 90 days is a sensible retention; tune as needed.
--
--   DELETE FROM "registry"."NotificationRead"
--    WHERE "readAt" < now() - INTERVAL '90 days';
