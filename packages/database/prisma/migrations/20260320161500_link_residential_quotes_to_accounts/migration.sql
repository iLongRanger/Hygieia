ALTER TABLE "residential_quotes"
  ADD COLUMN IF NOT EXISTS "account_id" UUID;

CREATE INDEX IF NOT EXISTS "residential_quotes_account_id_idx"
  ON "residential_quotes" ("account_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'residential_quotes_account_id_fkey'
  ) THEN
    ALTER TABLE "residential_quotes"
      ADD CONSTRAINT "residential_quotes_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
