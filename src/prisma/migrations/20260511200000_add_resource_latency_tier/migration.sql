-- Add nullable latencyTier label to Resource (e.g. "0.9s", "<2s", "Async (job)").
-- Surfaced on the public registry card via discovery serializer.

ALTER TABLE "registry"."Resource" ADD COLUMN IF NOT EXISTS "latencyTier" TEXT;
