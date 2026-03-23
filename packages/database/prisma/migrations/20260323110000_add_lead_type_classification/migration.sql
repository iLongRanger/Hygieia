ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) NOT NULL DEFAULT 'unknown';

UPDATE "leads"
SET "type" = CASE
  WHEN "converted_to_account_id" IS NOT NULL THEN COALESCE(
    (
      SELECT CASE
        WHEN a."type" IN ('commercial', 'residential') THEN a."type"
        ELSE 'unknown'
      END
      FROM "accounts" a
      WHERE a."id" = "leads"."converted_to_account_id"
    ),
    'unknown'
  )
  ELSE 'unknown'
END
WHERE "type" IS NULL OR "type" = '' OR "type" = 'unknown';

CREATE INDEX IF NOT EXISTS "leads_type_idx" ON "leads"("type");
