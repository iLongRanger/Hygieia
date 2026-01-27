-- AlterTable
ALTER TABLE "areas" ALTER COLUMN "condition_level" SET DEFAULT 'standard';

-- AlterTable
ALTER TABLE "contracts" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pricing_settings" ADD COLUMN     "admin_overhead_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.12,
ADD COLUMN     "equipment_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
ADD COLUMN     "insurance_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
ADD COLUMN     "labor_burden_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
ADD COLUMN     "labor_cost_per_hour" DECIMAL(8,2) NOT NULL DEFAULT 18.00,
ADD COLUMN     "sqft_per_labor_hour" DECIMAL(10,2) NOT NULL DEFAULT 2500,
ADD COLUMN     "supply_cost_per_sq_ft" DECIMAL(8,4),
ADD COLUMN     "supply_cost_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.04,
ADD COLUMN     "target_profit_margin" DECIMAL(5,4) NOT NULL DEFAULT 0.25,
ADD COLUMN     "travel_cost_per_visit" DECIMAL(8,2) NOT NULL DEFAULT 15.00,
ALTER COLUMN "id" DROP DEFAULT;
