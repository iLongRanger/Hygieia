CREATE TABLE "job_settlement_reviews" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ready',
    "issue_code" VARCHAR(50),
    "issue_summary" TEXT,
    "worker_explanation" TEXT,
    "worker_responded_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "last_worker_reminder_at" TIMESTAMPTZ(6),
    "last_manager_reminder_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_settlement_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_settlement_reviews_job_id_key" ON "job_settlement_reviews"("job_id");
CREATE INDEX "job_settlement_reviews_status_idx" ON "job_settlement_reviews"("status");
CREATE INDEX "job_settlement_reviews_issue_code_idx" ON "job_settlement_reviews"("issue_code");
CREATE INDEX "job_settlement_reviews_reviewed_by_user_id_idx" ON "job_settlement_reviews"("reviewed_by_user_id");

ALTER TABLE "job_settlement_reviews"
ADD CONSTRAINT "job_settlement_reviews_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_settlement_reviews"
ADD CONSTRAINT "job_settlement_reviews_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
