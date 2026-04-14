ALTER TABLE "contracts"
ADD COLUMN "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
ADD COLUMN "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "contracts" AS c
SET
  "tax_rate" = COALESCE(p."tax_rate", 0),
  "tax_amount" = COALESCE(p."tax_amount", 0)
FROM "proposals" AS p
WHERE c."proposal_id" = p."id";
