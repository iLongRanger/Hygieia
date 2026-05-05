ALTER TABLE "contracts"
  ADD COLUMN "compensation_type" VARCHAR(20) NOT NULL DEFAULT 'hourly',
  ADD COLUMN "subcontractor_percentage" DECIMAL(5,4),
  ADD COLUMN "pending_compensation_type" VARCHAR(20),
  ADD COLUMN "pending_subcontractor_percentage" DECIMAL(5,4);

UPDATE "contracts"
SET
  "compensation_type" = CASE
    WHEN "assigned_team_id" IS NOT NULL THEN 'percentage'
    ELSE 'hourly'
  END,
  "subcontractor_percentage" = CASE
    WHEN "assigned_team_id" IS NOT NULL THEN
      CASE COALESCE("subcontractor_tier", 'premium')
        WHEN 'labor_only' THEN 0.4000
        WHEN 'standard' THEN 0.5000
        WHEN 'premium' THEN 0.6000
        WHEN 'independent' THEN 0.7000
        ELSE 0.6000
      END
    ELSE NULL
  END,
  "pending_compensation_type" = CASE
    WHEN "pending_assigned_team_id" IS NOT NULL THEN 'percentage'
    WHEN "pending_assigned_to_user_id" IS NOT NULL THEN 'hourly'
    ELSE NULL
  END,
  "pending_subcontractor_percentage" = CASE
    WHEN "pending_assigned_team_id" IS NOT NULL THEN
      CASE COALESCE("pending_subcontractor_tier", "subcontractor_tier", 'premium')
        WHEN 'labor_only' THEN 0.4000
        WHEN 'standard' THEN 0.5000
        WHEN 'premium' THEN 0.6000
        WHEN 'independent' THEN 0.7000
        ELSE 0.6000
      END
    ELSE NULL
  END;

ALTER TABLE "jobs"
  ADD COLUMN "compensation_type" VARCHAR(20) NOT NULL DEFAULT 'hourly',
  ADD COLUMN "subcontractor_percentage_snapshot" DECIMAL(5,4),
  ADD COLUMN "job_revenue_snapshot" DECIMAL(12,2);

UPDATE "jobs" AS j
SET
  "compensation_type" = CASE
    WHEN j."assigned_team_id" IS NOT NULL THEN 'percentage'
    ELSE 'hourly'
  END,
  "subcontractor_percentage_snapshot" = CASE
    WHEN j."assigned_team_id" IS NOT NULL THEN
      CASE COALESCE(c."subcontractor_tier", 'premium')
        WHEN 'labor_only' THEN 0.4000
        WHEN 'standard' THEN 0.5000
        WHEN 'premium' THEN 0.6000
        WHEN 'independent' THEN 0.7000
        ELSE 0.6000
      END
    ELSE NULL
  END,
  "job_revenue_snapshot" = CASE
    WHEN c."monthly_value" IS NOT NULL THEN
      ROUND((c."monthly_value" / CASE COALESCE(c."service_frequency", 'weekly')
        WHEN '1x_week' THEN 4.33
        WHEN '2x_week' THEN 8.67
        WHEN '3x_week' THEN 13.00
        WHEN '4x_week' THEN 17.33
        WHEN '5x_week' THEN 21.67
        WHEN '7x_week' THEN 30.33
        WHEN 'daily' THEN 30.00
        WHEN 'weekly' THEN 4.33
        WHEN 'biweekly' THEN 2.17
        WHEN 'bi_weekly' THEN 2.17
        WHEN 'monthly' THEN 1.00
        WHEN 'quarterly' THEN 0.33
        ELSE 4.33
      END)::numeric, 2)
    ELSE NULL
  END
FROM "contracts" AS c
WHERE j."contract_id" = c."id";

CREATE INDEX "contracts_compensation_type_idx" ON "contracts"("compensation_type");
CREATE INDEX "jobs_compensation_type_idx" ON "jobs"("compensation_type");
