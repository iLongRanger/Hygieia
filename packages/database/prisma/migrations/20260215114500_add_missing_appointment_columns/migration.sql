-- Add missing appointment columns expected by Prisma schema
ALTER TABLE "appointments"
ADD COLUMN IF NOT EXISTS "completion_notes" TEXT,
ADD COLUMN IF NOT EXISTS "actual_duration" INTEGER,
ADD COLUMN IF NOT EXISTS "assigned_team_id" UUID,
ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMPTZ(6);

-- Keep index parity with Prisma schema
CREATE INDEX IF NOT EXISTS "appointments_assigned_team_id_idx" ON "appointments"("assigned_team_id");

-- Add FK only if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_assigned_team_id_fkey'
  ) THEN
    ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_assigned_team_id_fkey"
    FOREIGN KEY ("assigned_team_id")
    REFERENCES "teams"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
