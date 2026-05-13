UPDATE "password_set_tokens"
SET "used_at" = COALESCE("used_at", NOW())
WHERE "token_hash" IS NULL
  AND "used_at" IS NULL;
