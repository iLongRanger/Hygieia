-- AlterTable: Add pay fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pay_type" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hourly_pay_rate" DECIMAL(10, 2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" VARCHAR(200),
    "category_id" UUID NOT NULL,
    "job_id" UUID,
    "contract_id" UUID,
    "facility_id" UUID,
    "receipt_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_by_user_id" UUID NOT NULL,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payroll_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "total_gross_pay" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "total_entries" INTEGER NOT NULL DEFAULT 0,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payroll_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "pay_type" VARCHAR(20) NOT NULL,
    "scheduled_hours" DECIMAL(8, 2),
    "hourly_rate" DECIMAL(10, 2),
    "contract_id" UUID,
    "contract_monthly_value" DECIMAL(12, 2),
    "tier_percentage" DECIMAL(5, 2),
    "gross_pay" DECIMAL(12, 2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'valid',
    "flag_reason" TEXT,
    "adjusted_by_user_id" UUID,
    "adjustment_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expense_categories_is_active_idx" ON "expense_categories"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_job_id_idx" ON "expenses"("job_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_contract_id_idx" ON "expenses"("contract_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_facility_id_idx" ON "expenses"("facility_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_created_by_user_id_idx" ON "expenses"("created_by_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_runs_status_idx" ON "payroll_runs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_runs_period_start_period_end_idx" ON "payroll_runs"("period_start", "period_end");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_entries_payroll_run_id_idx" ON "payroll_entries"("payroll_run_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_entries_user_id_idx" ON "payroll_entries"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_entries_contract_id_idx" ON "payroll_entries"("contract_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_entries_status_idx" ON "payroll_entries"("status");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_adjusted_by_user_id_fkey" FOREIGN KEY ("adjusted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default expense categories
INSERT INTO expense_categories (id, name, description, is_default, is_active, sort_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Cleaning Supplies', 'Cleaning chemicals, paper products, trash bags', true, true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'Equipment', 'Vacuums, floor machines, tools', true, true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'Fuel / Travel', 'Gas, mileage, parking, tolls', true, true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'Insurance', 'Liability, workers comp, vehicle insurance', true, true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'Maintenance', 'Equipment repairs, vehicle maintenance', true, true, 5, NOW(), NOW()),
  (gen_random_uuid(), 'Rent / Utilities', 'Office rent, storage, phone, internet', true, true, 6, NOW(), NOW()),
  (gen_random_uuid(), 'Other', 'Miscellaneous business expenses', true, true, 99, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
