-- Simplify contract renewal: update-in-place instead of creating new records

-- Convert any 'renewed' contracts to 'expired'
UPDATE "contracts" SET "status" = 'expired' WHERE "status" = 'renewed';

-- Drop the indexes first
DROP INDEX IF EXISTS "contracts_contract_source_idx";
DROP INDEX IF EXISTS "contracts_renewed_from_contract_id_idx";

-- Drop the unique constraint on renewed_from_contract_id
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_renewed_from_contract_id_key";

-- Drop the foreign key constraint
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_renewed_from_contract_id_fkey";

-- Drop the columns
ALTER TABLE "contracts" DROP COLUMN IF EXISTS "contract_source";
ALTER TABLE "contracts" DROP COLUMN IF EXISTS "renewed_from_contract_id";
