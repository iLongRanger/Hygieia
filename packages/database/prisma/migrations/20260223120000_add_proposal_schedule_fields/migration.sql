-- Add proposal-level recurring service scheduling fields
ALTER TABLE "proposals"
  ADD COLUMN IF NOT EXISTS "service_frequency" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "service_schedule" JSONB;

