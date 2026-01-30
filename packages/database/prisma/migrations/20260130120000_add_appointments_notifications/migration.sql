-- Appointments + Notifications

-- ============================================================
-- Step 1: Create appointments table
-- ============================================================

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'walk_through',
  "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  "scheduled_start" TIMESTAMPTZ(6) NOT NULL,
  "scheduled_end" TIMESTAMPTZ(6) NOT NULL,
  "timezone" VARCHAR(50) NOT NULL,
  "location" TEXT,
  "notes" TEXT,
  "assigned_to_user_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "rescheduled_from_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_fkey"
  FOREIGN KEY ("rescheduled_from_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "appointments_lead_id_idx" ON "appointments"("lead_id");
CREATE INDEX IF NOT EXISTS "appointments_assigned_to_user_id_idx" ON "appointments"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS "appointments_scheduled_start_idx" ON "appointments"("scheduled_start");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");

-- ============================================================
-- Step 2: Create notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_read_at_idx" ON "notifications"("read_at");
