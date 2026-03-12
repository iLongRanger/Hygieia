-- Restored migration content for operations, billing, and base inspection tables.
-- This folder previously existed only as a placeholder, which broke shadow DB replay
-- because later migrations assume the inspection tables already exist.

CREATE TABLE IF NOT EXISTS "inspection_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "facility_type_filter" VARCHAR(50),
  "contract_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "inspection_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_template_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "item_text" VARCHAR(500) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "weight" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "inspection_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspection_number" VARCHAR(50) NOT NULL,
  "template_id" UUID,
  "job_id" UUID,
  "contract_id" UUID,
  "facility_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "inspector_user_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  "scheduled_date" DATE NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "overall_score" DECIMAL(5, 2),
  "overall_rating" VARCHAR(20),
  "notes" TEXT,
  "summary" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspection_id" UUID NOT NULL,
  "template_item_id" UUID,
  "category" VARCHAR(100) NOT NULL,
  "item_text" VARCHAR(500) NOT NULL,
  "score" VARCHAR(10),
  "rating" INTEGER,
  "notes" TEXT,
  "photo_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspection_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "performed_by_user_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_number" VARCHAR(50) NOT NULL,
  "contract_id" UUID NOT NULL,
  "facility_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "assigned_team_id" UUID,
  "assigned_to_user_id" UUID,
  "job_type" VARCHAR(30) NOT NULL DEFAULT 'scheduled_service',
  "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  "scheduled_date" DATE NOT NULL,
  "scheduled_start_time" TIMESTAMPTZ(6),
  "scheduled_end_time" TIMESTAMPTZ(6),
  "actual_start_time" TIMESTAMPTZ(6),
  "actual_end_time" TIMESTAMPTZ(6),
  "estimated_hours" DECIMAL(6, 2),
  "actual_hours" DECIMAL(6, 2),
  "notes" TEXT,
  "completion_notes" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "facility_task_id" UUID,
  "task_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "estimated_minutes" INTEGER,
  "actual_minutes" INTEGER,
  "completed_by_user_id" UUID,
  "completed_at" TIMESTAMPTZ(6),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "note_type" VARCHAR(30) NOT NULL DEFAULT 'general',
  "content" TEXT NOT NULL,
  "photo_url" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "job_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "performed_by_user_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_number" VARCHAR(50) NOT NULL,
  "contract_id" UUID,
  "account_id" UUID NOT NULL,
  "facility_id" UUID,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "issue_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "period_start" DATE,
  "period_end" DATE,
  "subtotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "amount_paid" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "balance_due" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "payment_instructions" TEXT,
  "public_token" VARCHAR(100),
  "public_token_expires_at" TIMESTAMPTZ(6),
  "sent_at" TIMESTAMPTZ(6),
  "viewed_at" TIMESTAMPTZ(6),
  "paid_at" TIMESTAMPTZ(6),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "item_type" VARCHAR(20) NOT NULL DEFAULT 'service',
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10, 2) NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "total_price" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "payment_date" DATE NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "payment_method" VARCHAR(20) NOT NULL,
  "reference_number" VARCHAR(100),
  "notes" TEXT,
  "recorded_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "performed_by_user_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quotations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "facility_id" UUID,
  "quotation_number" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "description" TEXT,
  "subtotal" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "valid_until" DATE,
  "notes" TEXT,
  "terms_and_conditions" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "viewed_at" TIMESTAMPTZ(6),
  "accepted_at" TIMESTAMPTZ(6),
  "rejected_at" TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  "public_token" VARCHAR(64),
  "public_token_expires_at" TIMESTAMPTZ(6),
  "signature_name" VARCHAR(255),
  "signature_date" TIMESTAMPTZ(6),
  "signature_ip" VARCHAR(45),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quotation_services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quotation_id" UUID NOT NULL,
  "service_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12, 2) NOT NULL,
  "included_tasks" JSONB NOT NULL DEFAULT '[]',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "quotation_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quotation_id" UUID NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "performed_by_user_id" UUID,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotation_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inspections_inspection_number_key" ON "inspections"("inspection_number");
CREATE INDEX IF NOT EXISTS "inspection_templates_contract_id_idx" ON "inspection_templates"("contract_id");
CREATE INDEX IF NOT EXISTS "inspection_templates_archived_at_idx" ON "inspection_templates"("archived_at");
CREATE INDEX IF NOT EXISTS "inspection_template_items_template_id_idx" ON "inspection_template_items"("template_id");
CREATE INDEX IF NOT EXISTS "inspections_inspection_number_idx" ON "inspections"("inspection_number");
CREATE INDEX IF NOT EXISTS "inspections_template_id_idx" ON "inspections"("template_id");
CREATE INDEX IF NOT EXISTS "inspections_job_id_idx" ON "inspections"("job_id");
CREATE INDEX IF NOT EXISTS "inspections_contract_id_idx" ON "inspections"("contract_id");
CREATE INDEX IF NOT EXISTS "inspections_facility_id_idx" ON "inspections"("facility_id");
CREATE INDEX IF NOT EXISTS "inspections_account_id_idx" ON "inspections"("account_id");
CREATE INDEX IF NOT EXISTS "inspections_inspector_user_id_idx" ON "inspections"("inspector_user_id");
CREATE INDEX IF NOT EXISTS "inspections_status_idx" ON "inspections"("status");
CREATE INDEX IF NOT EXISTS "inspections_scheduled_date_idx" ON "inspections"("scheduled_date");
CREATE INDEX IF NOT EXISTS "inspection_items_inspection_id_idx" ON "inspection_items"("inspection_id");
CREATE INDEX IF NOT EXISTS "inspection_activities_inspection_id_idx" ON "inspection_activities"("inspection_id");
CREATE INDEX IF NOT EXISTS "inspection_activities_action_idx" ON "inspection_activities"("action");
CREATE INDEX IF NOT EXISTS "inspection_activities_created_at_idx" ON "inspection_activities"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_job_number_key" ON "jobs"("job_number");
CREATE INDEX IF NOT EXISTS "jobs_job_number_idx" ON "jobs"("job_number");
CREATE INDEX IF NOT EXISTS "jobs_contract_id_idx" ON "jobs"("contract_id");
CREATE INDEX IF NOT EXISTS "jobs_facility_id_idx" ON "jobs"("facility_id");
CREATE INDEX IF NOT EXISTS "jobs_account_id_idx" ON "jobs"("account_id");
CREATE INDEX IF NOT EXISTS "jobs_assigned_team_id_idx" ON "jobs"("assigned_team_id");
CREATE INDEX IF NOT EXISTS "jobs_assigned_to_user_id_idx" ON "jobs"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS "jobs_job_type_idx" ON "jobs"("job_type");
CREATE INDEX IF NOT EXISTS "jobs_status_idx" ON "jobs"("status");
CREATE INDEX IF NOT EXISTS "jobs_scheduled_date_idx" ON "jobs"("scheduled_date");
CREATE INDEX IF NOT EXISTS "jobs_created_at_idx" ON "jobs"("created_at");
CREATE INDEX IF NOT EXISTS "job_tasks_job_id_idx" ON "job_tasks"("job_id");
CREATE INDEX IF NOT EXISTS "job_tasks_facility_task_id_idx" ON "job_tasks"("facility_task_id");
CREATE INDEX IF NOT EXISTS "job_tasks_status_idx" ON "job_tasks"("status");
CREATE INDEX IF NOT EXISTS "job_notes_job_id_idx" ON "job_notes"("job_id");
CREATE INDEX IF NOT EXISTS "job_notes_note_type_idx" ON "job_notes"("note_type");
CREATE INDEX IF NOT EXISTS "job_activities_job_id_idx" ON "job_activities"("job_id");
CREATE INDEX IF NOT EXISTS "job_activities_action_idx" ON "job_activities"("action");
CREATE INDEX IF NOT EXISTS "job_activities_created_at_idx" ON "job_activities"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_public_token_key" ON "invoices"("public_token");
CREATE INDEX IF NOT EXISTS "invoices_invoice_number_idx" ON "invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_contract_id_idx" ON "invoices"("contract_id");
CREATE INDEX IF NOT EXISTS "invoices_account_id_idx" ON "invoices"("account_id");
CREATE INDEX IF NOT EXISTS "invoices_facility_id_idx" ON "invoices"("facility_id");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX IF NOT EXISTS "invoices_public_token_idx" ON "invoices"("public_token");
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_payments_invoice_id_idx" ON "invoice_payments"("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_activities_invoice_id_idx" ON "invoice_activities"("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_activities_action_idx" ON "invoice_activities"("action");
CREATE INDEX IF NOT EXISTS "invoice_activities_created_at_idx" ON "invoice_activities"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_quotation_number_key" ON "quotations"("quotation_number");
CREATE UNIQUE INDEX IF NOT EXISTS "quotations_public_token_key" ON "quotations"("public_token");
CREATE INDEX IF NOT EXISTS "quotations_account_id_idx" ON "quotations"("account_id");
CREATE INDEX IF NOT EXISTS "quotations_facility_id_idx" ON "quotations"("facility_id");
CREATE INDEX IF NOT EXISTS "quotations_status_idx" ON "quotations"("status");
CREATE INDEX IF NOT EXISTS "quotations_quotation_number_idx" ON "quotations"("quotation_number");
CREATE INDEX IF NOT EXISTS "quotations_valid_until_idx" ON "quotations"("valid_until");
CREATE INDEX IF NOT EXISTS "quotations_sent_at_idx" ON "quotations"("sent_at");
CREATE INDEX IF NOT EXISTS "quotations_public_token_idx" ON "quotations"("public_token");
CREATE INDEX IF NOT EXISTS "quotation_services_quotation_id_idx" ON "quotation_services"("quotation_id");
CREATE INDEX IF NOT EXISTS "quotation_activities_quotation_id_idx" ON "quotation_activities"("quotation_id");
CREATE INDEX IF NOT EXISTS "quotation_activities_action_idx" ON "quotation_activities"("action");
CREATE INDEX IF NOT EXISTS "quotation_activities_created_at_idx" ON "quotation_activities"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_templates_contract_id_fkey'
  ) THEN
    ALTER TABLE "inspection_templates"
      ADD CONSTRAINT "inspection_templates_contract_id_fkey"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_templates_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_templates"
      ADD CONSTRAINT "inspection_templates_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_template_items_template_id_fkey'
  ) THEN
    ALTER TABLE "inspection_template_items"
      ADD CONSTRAINT "inspection_template_items_template_id_fkey"
      FOREIGN KEY ("template_id")
      REFERENCES "inspection_templates"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_template_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_template_id_fkey"
      FOREIGN KEY ("template_id")
      REFERENCES "inspection_templates"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_job_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_job_id_fkey"
      FOREIGN KEY ("job_id")
      REFERENCES "jobs"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_contract_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_contract_id_fkey"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_facility_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_facility_id_fkey"
      FOREIGN KEY ("facility_id")
      REFERENCES "facilities"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_account_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_account_id_fkey"
      FOREIGN KEY ("account_id")
      REFERENCES "accounts"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_inspector_user_id_fkey'
  ) THEN
    ALTER TABLE "inspections"
      ADD CONSTRAINT "inspections_inspector_user_id_fkey"
      FOREIGN KEY ("inspector_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_items_inspection_id_fkey'
  ) THEN
    ALTER TABLE "inspection_items"
      ADD CONSTRAINT "inspection_items_inspection_id_fkey"
      FOREIGN KEY ("inspection_id")
      REFERENCES "inspections"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_items_template_item_id_fkey'
  ) THEN
    ALTER TABLE "inspection_items"
      ADD CONSTRAINT "inspection_items_template_item_id_fkey"
      FOREIGN KEY ("template_item_id")
      REFERENCES "inspection_template_items"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_activities_inspection_id_fkey'
  ) THEN
    ALTER TABLE "inspection_activities"
      ADD CONSTRAINT "inspection_activities_inspection_id_fkey"
      FOREIGN KEY ("inspection_id")
      REFERENCES "inspections"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_activities_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_activities"
      ADD CONSTRAINT "inspection_activities_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_contract_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_contract_id_fkey"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_facility_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_facility_id_fkey"
      FOREIGN KEY ("facility_id")
      REFERENCES "facilities"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_account_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_account_id_fkey"
      FOREIGN KEY ("account_id")
      REFERENCES "accounts"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_assigned_team_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_assigned_team_id_fkey"
      FOREIGN KEY ("assigned_team_id")
      REFERENCES "teams"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_assigned_to_user_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_assigned_to_user_id_fkey"
      FOREIGN KEY ("assigned_to_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "jobs"
      ADD CONSTRAINT "jobs_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_tasks_job_id_fkey'
  ) THEN
    ALTER TABLE "job_tasks"
      ADD CONSTRAINT "job_tasks_job_id_fkey"
      FOREIGN KEY ("job_id")
      REFERENCES "jobs"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_tasks_facility_task_id_fkey'
  ) THEN
    ALTER TABLE "job_tasks"
      ADD CONSTRAINT "job_tasks_facility_task_id_fkey"
      FOREIGN KEY ("facility_task_id")
      REFERENCES "facility_tasks"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_tasks_completed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "job_tasks"
      ADD CONSTRAINT "job_tasks_completed_by_user_id_fkey"
      FOREIGN KEY ("completed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_notes_job_id_fkey'
  ) THEN
    ALTER TABLE "job_notes"
      ADD CONSTRAINT "job_notes_job_id_fkey"
      FOREIGN KEY ("job_id")
      REFERENCES "jobs"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_notes_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "job_notes"
      ADD CONSTRAINT "job_notes_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_activities_job_id_fkey'
  ) THEN
    ALTER TABLE "job_activities"
      ADD CONSTRAINT "job_activities_job_id_fkey"
      FOREIGN KEY ("job_id")
      REFERENCES "jobs"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_activities_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "job_activities"
      ADD CONSTRAINT "job_activities_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_contract_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_contract_id_fkey"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_account_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_account_id_fkey"
      FOREIGN KEY ("account_id")
      REFERENCES "accounts"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_facility_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_facility_id_fkey"
      FOREIGN KEY ("facility_id")
      REFERENCES "facilities"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "invoices"
      ADD CONSTRAINT "invoices_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_invoice_id_fkey'
  ) THEN
    ALTER TABLE "invoice_items"
      ADD CONSTRAINT "invoice_items_invoice_id_fkey"
      FOREIGN KEY ("invoice_id")
      REFERENCES "invoices"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_payments_invoice_id_fkey'
  ) THEN
    ALTER TABLE "invoice_payments"
      ADD CONSTRAINT "invoice_payments_invoice_id_fkey"
      FOREIGN KEY ("invoice_id")
      REFERENCES "invoices"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_payments_recorded_by_user_id_fkey'
  ) THEN
    ALTER TABLE "invoice_payments"
      ADD CONSTRAINT "invoice_payments_recorded_by_user_id_fkey"
      FOREIGN KEY ("recorded_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_activities_invoice_id_fkey'
  ) THEN
    ALTER TABLE "invoice_activities"
      ADD CONSTRAINT "invoice_activities_invoice_id_fkey"
      FOREIGN KEY ("invoice_id")
      REFERENCES "invoices"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_activities_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "invoice_activities"
      ADD CONSTRAINT "invoice_activities_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotations_account_id_fkey'
  ) THEN
    ALTER TABLE "quotations"
      ADD CONSTRAINT "quotations_account_id_fkey"
      FOREIGN KEY ("account_id")
      REFERENCES "accounts"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotations_facility_id_fkey'
  ) THEN
    ALTER TABLE "quotations"
      ADD CONSTRAINT "quotations_facility_id_fkey"
      FOREIGN KEY ("facility_id")
      REFERENCES "facilities"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotations_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "quotations"
      ADD CONSTRAINT "quotations_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotation_services_quotation_id_fkey'
  ) THEN
    ALTER TABLE "quotation_services"
      ADD CONSTRAINT "quotation_services_quotation_id_fkey"
      FOREIGN KEY ("quotation_id")
      REFERENCES "quotations"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotation_activities_quotation_id_fkey'
  ) THEN
    ALTER TABLE "quotation_activities"
      ADD CONSTRAINT "quotation_activities_quotation_id_fkey"
      FOREIGN KEY ("quotation_id")
      REFERENCES "quotations"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotation_activities_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "quotation_activities"
      ADD CONSTRAINT "quotation_activities_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
