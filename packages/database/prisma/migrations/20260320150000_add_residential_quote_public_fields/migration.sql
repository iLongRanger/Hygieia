ALTER TABLE "residential_quotes"
  ADD COLUMN IF NOT EXISTS "public_token" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "public_token_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "signature_name" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "signature_date" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "signature_ip" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "residential_quotes_public_token_key"
  ON "residential_quotes" ("public_token")
  WHERE "public_token" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "residential_quotes_public_token_idx"
  ON "residential_quotes" ("public_token");
