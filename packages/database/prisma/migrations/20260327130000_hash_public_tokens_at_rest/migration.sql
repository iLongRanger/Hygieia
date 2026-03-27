CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "proposals"
SET "public_token" = encode(digest("public_token", 'sha256'), 'hex')
WHERE "public_token" IS NOT NULL;

UPDATE "contracts"
SET "public_token" = encode(digest("public_token", 'sha256'), 'hex')
WHERE "public_token" IS NOT NULL;

UPDATE "contract_amendments"
SET "public_token" = encode(digest("public_token", 'sha256'), 'hex')
WHERE "public_token" IS NOT NULL;

UPDATE "residential_quotes"
SET "public_token" = encode(digest("public_token", 'sha256'), 'hex')
WHERE "public_token" IS NOT NULL;

UPDATE "quotations"
SET "public_token" = encode(digest("public_token", 'sha256'), 'hex')
WHERE "public_token" IS NOT NULL;
