CREATE UNIQUE INDEX IF NOT EXISTS "jobs_contract_scheduled_date_recurring_unique"
ON "jobs" ("contract_id", "scheduled_date")
WHERE "job_category" = 'recurring' AND "status" <> 'canceled';
