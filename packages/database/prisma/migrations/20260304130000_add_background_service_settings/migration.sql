CREATE TABLE "background_service_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_key" VARCHAR(50) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "interval_ms" INTEGER NOT NULL,
  "last_run_at" TIMESTAMPTZ(6),
  "last_success_at" TIMESTAMPTZ(6),
  "last_error" TEXT,
  "last_error_at" TIMESTAMPTZ(6),
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "background_service_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "background_service_settings_service_key_key"
  ON "background_service_settings" ("service_key");

CREATE INDEX "background_service_settings_enabled_idx"
  ON "background_service_settings" ("enabled");

ALTER TABLE "background_service_settings"
  ADD CONSTRAINT "background_service_settings_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "background_service_settings" ("service_key", "enabled", "interval_ms")
VALUES
  ('reminders', false, 900000),
  ('recurring_jobs_autogen', true, 21600000),
  ('job_alerts', true, 900000)
ON CONFLICT ("service_key") DO NOTHING;
