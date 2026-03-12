ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "facility_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'appointments_facility_id_fkey'
      AND table_name = 'appointments'
  ) THEN
    ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_facility_id_fkey"
    FOREIGN KEY ("facility_id") REFERENCES "facilities"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_facility_id_idx"
ON "appointments"("facility_id");
