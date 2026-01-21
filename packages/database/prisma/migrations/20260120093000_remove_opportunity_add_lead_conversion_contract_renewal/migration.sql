-- Data Flow Alignment Migration
-- Removes Opportunity model and adds Lead conversion + Contract renewal tracking

-- ============================================================
-- Step 1: Drop Opportunity-related foreign keys and indexes
-- ============================================================

-- Drop foreign key from proposals to opportunities
ALTER TABLE "proposals" DROP CONSTRAINT IF EXISTS "proposals_opportunity_id_fkey";

-- Drop index on proposals.opportunity_id
DROP INDEX IF EXISTS "proposals_opportunity_id_idx";

-- Drop column from proposals
ALTER TABLE "proposals" DROP COLUMN IF EXISTS "opportunity_id";

-- Drop the opportunities table
DROP TABLE IF EXISTS "opportunities";

-- ============================================================
-- Step 2: Add Lead conversion tracking fields
-- ============================================================

-- Add conversion tracking fields to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "converted_to_account_id" UUID;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "converted_at" TIMESTAMPTZ(6);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "converted_by_user_id" UUID;

-- Add unique constraint on converted_to_account_id (one lead per account)
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_account_id_key" UNIQUE ("converted_to_account_id");

-- Add foreign key for converted_to_account_id
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_account_id_fkey"
  FOREIGN KEY ("converted_to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for converted_by_user_id
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_by_user_id_fkey"
  FOREIGN KEY ("converted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for converted_to_account_id
CREATE INDEX IF NOT EXISTS "leads_converted_to_account_id_idx" ON "leads"("converted_to_account_id");

-- ============================================================
-- Step 3: Add Contract source and renewal tracking fields
-- ============================================================

-- Add contract_source field
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "contract_source" VARCHAR(20) NOT NULL DEFAULT 'proposal';

-- Add renewal tracking fields
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "renewed_from_contract_id" UUID;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "renewal_number" INTEGER NOT NULL DEFAULT 0;

-- Add unique constraint on renewed_from_contract_id (one renewal per contract)
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_renewed_from_contract_id_key" UNIQUE ("renewed_from_contract_id");

-- Add self-referential foreign key for contract renewal chain
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_renewed_from_contract_id_fkey"
  FOREIGN KEY ("renewed_from_contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "contracts_contract_source_idx" ON "contracts"("contract_source");
CREATE INDEX IF NOT EXISTS "contracts_renewed_from_contract_id_idx" ON "contracts"("renewed_from_contract_id");
