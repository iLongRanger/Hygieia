CREATE TABLE "invoice_job_allocations" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "invoice_item_id" UUID,
    "job_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_job_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_job_allocations_job_id_key" ON "invoice_job_allocations"("job_id");
CREATE INDEX "invoice_job_allocations_invoice_id_idx" ON "invoice_job_allocations"("invoice_id");
CREATE INDEX "invoice_job_allocations_invoice_item_id_idx" ON "invoice_job_allocations"("invoice_item_id");

ALTER TABLE "invoice_job_allocations"
ADD CONSTRAINT "invoice_job_allocations_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_job_allocations"
ADD CONSTRAINT "invoice_job_allocations_invoice_item_id_fkey"
FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_job_allocations"
ADD CONSTRAINT "invoice_job_allocations_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payroll_job_allocations" (
    "id" UUID NOT NULL,
    "payroll_entry_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "allocated_hours" DECIMAL(8,2),
    "allocated_gross_pay" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_job_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_job_allocations_job_id_key" ON "payroll_job_allocations"("job_id");
CREATE INDEX "payroll_job_allocations_payroll_entry_id_idx" ON "payroll_job_allocations"("payroll_entry_id");

ALTER TABLE "payroll_job_allocations"
ADD CONSTRAINT "payroll_job_allocations_payroll_entry_id_fkey"
FOREIGN KEY ("payroll_entry_id") REFERENCES "payroll_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_job_allocations"
ADD CONSTRAINT "payroll_job_allocations_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "jobs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
