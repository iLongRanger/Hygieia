CREATE TABLE "background_service_run_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_key" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "summary" TEXT NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "ended_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "background_service_run_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "background_service_run_logs_service_key_created_at_idx"
  ON "background_service_run_logs" ("service_key", "created_at" DESC);

CREATE INDEX "background_service_run_logs_status_idx"
  ON "background_service_run_logs" ("status");
