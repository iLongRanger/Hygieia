-- Add pricing strategy fields to Proposal
-- pricingStrategyKey: Identifies which pricing strategy was used (e.g., 'sqft_settings_v1')
-- pricingStrategyVersion: Version/timestamp of the strategy for audit purposes
-- pricingSnapshot: Full snapshot of pricing settings used (for reproducibility)
ALTER TABLE "proposals" ADD COLUMN "pricing_strategy_key" VARCHAR(100);
ALTER TABLE "proposals" ADD COLUMN "pricing_strategy_version" VARCHAR(50);
ALTER TABLE "proposals" ADD COLUMN "pricing_snapshot" JSONB;
ALTER TABLE "proposals" ADD COLUMN "pricing_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "proposals" ADD COLUMN "pricing_locked_at" TIMESTAMPTZ(6);

-- Add defaultPricingStrategyKey to Facility for prefill
ALTER TABLE "facilities" ADD COLUMN "default_pricing_strategy_key" VARCHAR(100) DEFAULT 'sqft_settings_v1';

-- Add defaultPricingStrategyKey to Account for account-level default
ALTER TABLE "accounts" ADD COLUMN "default_pricing_strategy_key" VARCHAR(100) DEFAULT 'sqft_settings_v1';

-- Create index for efficient lookups
CREATE INDEX "proposals_pricing_strategy_key_idx" ON "proposals"("pricing_strategy_key");
CREATE INDEX "proposals_pricing_locked_idx" ON "proposals"("pricing_locked");
CREATE INDEX "facilities_default_pricing_strategy_key_idx" ON "facilities"("default_pricing_strategy_key");
CREATE INDEX "accounts_default_pricing_strategy_key_idx" ON "accounts"("default_pricing_strategy_key");

-- Backfill existing proposals with sqft_settings_v1 strategy
UPDATE "proposals" SET
  "pricing_strategy_key" = 'sqft_settings_v1',
  "pricing_strategy_version" = '1.0.0'
WHERE "pricing_strategy_key" IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "proposals"."pricing_strategy_key" IS 'Identifies which pricing strategy was used for this proposal (e.g., sqft_settings_v1)';
COMMENT ON COLUMN "proposals"."pricing_strategy_version" IS 'Version of the strategy at time of pricing calculation';
COMMENT ON COLUMN "proposals"."pricing_snapshot" IS 'Full snapshot of pricing settings used for reproducibility';
COMMENT ON COLUMN "proposals"."pricing_locked" IS 'Whether pricing is locked (prevents automatic recalculation)';
COMMENT ON COLUMN "proposals"."pricing_locked_at" IS 'Timestamp when pricing was locked';
COMMENT ON COLUMN "facilities"."default_pricing_strategy_key" IS 'Default pricing strategy for new proposals at this facility';
COMMENT ON COLUMN "accounts"."default_pricing_strategy_key" IS 'Default pricing strategy for new proposals for this account';
