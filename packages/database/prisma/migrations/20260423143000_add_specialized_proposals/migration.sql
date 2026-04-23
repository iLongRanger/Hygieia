-- Add one-time/specialized proposal support so quotation workflows can move into proposals.

ALTER TABLE "proposals"
  ADD COLUMN IF NOT EXISTS "proposal_type" VARCHAR(30) NOT NULL DEFAULT 'recurring',
  ADD COLUMN IF NOT EXISTS "scheduled_date" DATE,
  ADD COLUMN IF NOT EXISTS "scheduled_start_time" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "scheduled_end_time" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_approval_status" VARCHAR(20) NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS "pricing_approval_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "pricing_approval_requested_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_approval_requested_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_approved_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_approval_rejected_at" TIMESTAMPTZ(6);

ALTER TABLE "proposal_services"
  ADD COLUMN IF NOT EXISTS "catalog_item_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_meta" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "proposal_id" UUID;

CREATE INDEX IF NOT EXISTS "proposals_proposal_type_idx" ON "proposals"("proposal_type");
CREATE INDEX IF NOT EXISTS "proposals_scheduled_date_idx" ON "proposals"("scheduled_date");
CREATE INDEX IF NOT EXISTS "proposals_pricing_approval_status_idx" ON "proposals"("pricing_approval_status");
CREATE INDEX IF NOT EXISTS "proposal_services_catalog_item_id_idx" ON "proposal_services"("catalog_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_proposal_id_key" ON "jobs"("proposal_id");
CREATE INDEX IF NOT EXISTS "jobs_proposal_id_idx" ON "jobs"("proposal_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_services_catalog_item_id_fkey'
  ) THEN
    ALTER TABLE "proposal_services"
      ADD CONSTRAINT "proposal_services_catalog_item_id_fkey"
      FOREIGN KEY ("catalog_item_id")
      REFERENCES "one_time_service_catalog_items"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_proposal_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_proposal_id_fkey"
      FOREIGN KEY ("proposal_id")
      REFERENCES "proposals"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
