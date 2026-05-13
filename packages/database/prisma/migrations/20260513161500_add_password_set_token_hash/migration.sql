ALTER TABLE "password_set_tokens"
ADD COLUMN "token_hash" VARCHAR(64);

CREATE UNIQUE INDEX "password_set_tokens_token_hash_key"
ON "password_set_tokens"("token_hash");
