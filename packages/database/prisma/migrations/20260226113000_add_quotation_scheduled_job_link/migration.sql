ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "quotation_id" UUID;

ALTER TABLE "jobs"
  ALTER COLUMN "contract_id" DROP NOT NULL;

ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "scheduled_date" DATE,
  ADD COLUMN IF NOT EXISTS "scheduled_start_time" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "scheduled_end_time" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "jobs_quotation_id_key"
  ON "jobs" ("quotation_id")
  WHERE "quotation_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "jobs_quotation_id_idx"
  ON "jobs" ("quotation_id");

CREATE INDEX IF NOT EXISTS "quotations_scheduled_date_idx"
  ON "quotations" ("scheduled_date");

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_quotation_id_fkey"
  FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "jobs"
  DROP CONSTRAINT IF EXISTS "jobs_contract_id_fkey";

ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
