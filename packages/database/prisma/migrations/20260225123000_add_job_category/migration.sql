ALTER TABLE "jobs"
  ADD COLUMN "job_category" VARCHAR(20) NOT NULL DEFAULT 'one_time';

UPDATE "jobs"
SET "job_category" = 'recurring'
WHERE "job_type" = 'scheduled_service';

CREATE INDEX "jobs_job_category_idx" ON "jobs"("job_category");
