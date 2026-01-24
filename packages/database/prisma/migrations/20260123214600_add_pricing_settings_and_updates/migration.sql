-- CreateTable
CREATE TABLE "pricing_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "base_rate_per_sq_ft" DECIMAL(8,4) NOT NULL DEFAULT 0.10,
    "minimum_monthly_charge" DECIMAL(10,2) NOT NULL DEFAULT 250,
    "floor_type_multipliers" JSONB NOT NULL DEFAULT '{"vct": 1.0, "carpet": 1.15, "tile": 1.1, "hardwood": 1.2, "concrete": 0.9, "other": 1.0}',
    "frequency_multipliers" JSONB NOT NULL DEFAULT '{"1x_week": 1.0, "2x_week": 1.8, "3x_week": 2.5, "4x_week": 3.2, "5x_week": 4.0, "daily": 4.33, "weekly": 1.0, "biweekly": 0.5, "monthly": 0.25, "quarterly": 0.083}',
    "condition_multipliers" JSONB NOT NULL DEFAULT '{"standard": 1.0, "medium": 1.25, "hard": 1.33}',
    "building_type_multipliers" JSONB NOT NULL DEFAULT '{"office": 1.0, "medical": 1.3, "industrial": 1.15, "retail": 1.05, "educational": 1.1, "warehouse": 0.9, "residential": 1.0, "mixed": 1.05, "other": 1.0}',
    "task_complexity_add_ons" JSONB NOT NULL DEFAULT '{"standard": 0, "sanitization": 0.15, "biohazard": 0.5, "high_security": 0.2}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_settings_name_key" ON "pricing_settings"("name");

-- CreateIndex
CREATE INDEX "pricing_settings_is_active_idx" ON "pricing_settings"("is_active");

-- AlterTable: Add floor_type to areas
ALTER TABLE "areas" ADD COLUMN "floor_type" VARCHAR(20) NOT NULL DEFAULT 'vct';

-- CreateIndex
CREATE INDEX "areas_floor_type_idx" ON "areas"("floor_type");

-- Update existing condition_level values from old to new (if any exist)
UPDATE "areas" SET "condition_level" = 'standard' WHERE "condition_level" IN ('excellent', 'good');
UPDATE "areas" SET "condition_level" = 'medium' WHERE "condition_level" = 'fair';
UPDATE "areas" SET "condition_level" = 'hard' WHERE "condition_level" = 'poor';

-- AlterTable: Add initial clean fields to contracts
ALTER TABLE "contracts" ADD COLUMN "includes_initial_clean" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "contracts" ADD COLUMN "initial_clean_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contracts" ADD COLUMN "initial_clean_completed_at" TIMESTAMPTZ(6);
ALTER TABLE "contracts" ADD COLUMN "initial_clean_completed_by_user_id" UUID;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_initial_clean_completed_by_user_id_fkey" FOREIGN KEY ("initial_clean_completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default pricing settings
INSERT INTO "pricing_settings" ("id", "name", "updated_at")
VALUES (gen_random_uuid(), 'Default', CURRENT_TIMESTAMP);
