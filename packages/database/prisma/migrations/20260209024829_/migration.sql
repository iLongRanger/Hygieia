/*
  Warnings:

  - You are about to drop the column `default_pricing_strategy_key` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `default_pricing_strategy_key` on the `facilities` table. All the data in the column will be lost.
  - You are about to drop the column `building_type_multipliers` on the `pricing_settings` table. All the data in the column will be lost.
  - The `sqft_per_labor_hour` column on the `pricing_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `pricing_strategy_key` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the column `pricing_strategy_version` on the `proposals` table. All the data in the column will be lost.
  - You are about to drop the `pricing_overrides` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pricing_rules` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[public_token]` on the table `proposals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "pricing_overrides" DROP CONSTRAINT "pricing_overrides_approved_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_overrides" DROP CONSTRAINT "pricing_overrides_created_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_overrides" DROP CONSTRAINT "pricing_overrides_facility_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_overrides" DROP CONSTRAINT "pricing_overrides_pricing_rule_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_rules" DROP CONSTRAINT "pricing_rules_area_type_id_fkey";

-- DropForeignKey
ALTER TABLE "pricing_rules" DROP CONSTRAINT "pricing_rules_created_by_user_id_fkey";

-- DropIndex
DROP INDEX "accounts_default_pricing_strategy_key_idx";

-- DropIndex
DROP INDEX "facilities_default_pricing_strategy_key_idx";

-- DropIndex
DROP INDEX "proposals_pricing_strategy_key_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "default_pricing_strategy_key",
ADD COLUMN     "default_pricing_plan_id" UUID;

-- AlterTable
ALTER TABLE "facilities" DROP COLUMN "default_pricing_strategy_key",
ADD COLUMN     "default_pricing_plan_id" UUID;

-- AlterTable
ALTER TABLE "global_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pricing_settings" DROP COLUMN "building_type_multipliers",
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricing_type" VARCHAR(20) NOT NULL DEFAULT 'square_foot',
ADD COLUMN     "subcontractor_percentage" DECIMAL(5,4) NOT NULL DEFAULT 0.60,
DROP COLUMN "sqft_per_labor_hour",
ADD COLUMN     "sqft_per_labor_hour" JSONB NOT NULL DEFAULT '{"office": 2500, "medical": 1500, "industrial": 2200, "retail": 2400, "educational": 2000, "warehouse": 3500, "residential": 2200, "mixed": 2200, "other": 2500}';

-- AlterTable
ALTER TABLE "proposals" DROP COLUMN "pricing_strategy_key",
DROP COLUMN "pricing_strategy_version",
ADD COLUMN     "pricing_plan_id" UUID,
ADD COLUMN     "public_token" VARCHAR(64),
ADD COLUMN     "public_token_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "signature_date" TIMESTAMPTZ(6),
ADD COLUMN     "signature_ip" VARCHAR(45),
ADD COLUMN     "signature_name" VARCHAR(255);

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "pricing_overrides";

-- DropTable
DROP TABLE "pricing_rules";

-- CreateTable
CREATE TABLE "proposal_activities" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "terms_and_conditions" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "proposal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_versions" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "change_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposal_activities_proposal_id_idx" ON "proposal_activities"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_activities_action_idx" ON "proposal_activities"("action");

-- CreateIndex
CREATE INDEX "proposal_activities_created_at_idx" ON "proposal_activities"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_templates_name_key" ON "proposal_templates"("name");

-- CreateIndex
CREATE INDEX "proposal_templates_is_default_idx" ON "proposal_templates"("is_default");

-- CreateIndex
CREATE INDEX "proposal_versions_proposal_id_idx" ON "proposal_versions"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_versions_proposal_id_version_number_key" ON "proposal_versions"("proposal_id", "version_number");

-- CreateIndex
CREATE INDEX "accounts_default_pricing_plan_id_idx" ON "accounts"("default_pricing_plan_id");

-- CreateIndex
CREATE INDEX "facilities_default_pricing_plan_id_idx" ON "facilities"("default_pricing_plan_id");

-- CreateIndex
CREATE INDEX "pricing_settings_pricing_type_idx" ON "pricing_settings"("pricing_type");

-- CreateIndex
CREATE INDEX "pricing_settings_is_default_idx" ON "pricing_settings"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_public_token_key" ON "proposals"("public_token");

-- CreateIndex
CREATE INDEX "proposals_pricing_plan_id_idx" ON "proposals"("pricing_plan_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_default_pricing_plan_id_fkey" FOREIGN KEY ("default_pricing_plan_id") REFERENCES "pricing_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_default_pricing_plan_id_fkey" FOREIGN KEY ("default_pricing_plan_id") REFERENCES "pricing_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_activities" ADD CONSTRAINT "proposal_activities_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_activities" ADD CONSTRAINT "proposal_activities_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
