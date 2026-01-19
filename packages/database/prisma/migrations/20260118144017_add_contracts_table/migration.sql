-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "account_id" UUID NOT NULL,
    "facility_id" UUID,
    "proposal_id" UUID,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "service_frequency" VARCHAR(30),
    "service_schedule" JSONB,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "renewal_notice_days" INTEGER DEFAULT 30,
    "monthly_value" DECIMAL(12,2) NOT NULL,
    "total_value" DECIMAL(12,2),
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "payment_terms" VARCHAR(50) NOT NULL DEFAULT 'Net 30',
    "terms_and_conditions" TEXT,
    "special_instructions" TEXT,
    "signed_document_url" TEXT,
    "signed_date" DATE,
    "signed_by_name" VARCHAR(255),
    "signed_by_email" VARCHAR(255),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "termination_reason" TEXT,
    "terminated_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contracts_dates_valid" CHECK ("end_date" IS NULL OR "end_date" > "start_date"),
    CONSTRAINT "contracts_monthly_value_positive" CHECK ("monthly_value" > 0),
    CONSTRAINT "contracts_total_value_positive" CHECK ("total_value" IS NULL OR "total_value" >= 0),
    CONSTRAINT "contracts_renewal_notice_positive" CHECK ("renewal_notice_days" IS NULL OR "renewal_notice_days" > 0),
    CONSTRAINT "contracts_signed_complete" CHECK (
        ("signed_date" IS NULL AND "signed_by_name" IS NULL AND "signed_by_email" IS NULL) OR
        ("signed_date" IS NOT NULL AND "signed_by_name" IS NOT NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_contract_number_idx" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_account_id_idx" ON "contracts"("account_id");

-- CreateIndex
CREATE INDEX "contracts_facility_id_idx" ON "contracts"("facility_id");

-- CreateIndex
CREATE INDEX "contracts_proposal_id_idx" ON "contracts"("proposal_id");

-- CreateIndex
CREATE INDEX "contracts_start_date_idx" ON "contracts"("start_date");

-- CreateIndex
CREATE INDEX "contracts_end_date_idx" ON "contracts"("end_date");

-- CreateIndex
CREATE INDEX "contracts_created_at_idx" ON "contracts"("created_at");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
