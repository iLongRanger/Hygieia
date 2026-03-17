ALTER TABLE "contract_amendments"
    ADD COLUMN IF NOT EXISTS "public_token" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "public_token_expires_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "signature_ip" VARCHAR(45),
    ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "viewed_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "signed_date" DATE,
    ADD COLUMN IF NOT EXISTS "signed_by_name" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "signed_by_email" VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS "contract_amendments_public_token_key"
    ON "contract_amendments"("public_token");

CREATE INDEX IF NOT EXISTS "contract_amendments_public_token_idx"
    ON "contract_amendments"("public_token");

CREATE INDEX IF NOT EXISTS "contract_amendments_sent_at_idx"
    ON "contract_amendments"("sent_at");
