-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "supabase_user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_sources" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "lead_source_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'lead',
    "company_name" VARCHAR(255),
    "contact_name" VARCHAR(255) NOT NULL,
    "primary_email" VARCHAR(255),
    "primary_phone" VARCHAR(20),
    "secondary_email" VARCHAR(255),
    "secondary_phone" VARCHAR(20),
    "address" JSONB,
    "estimated_value" DECIMAL(12,2),
    "probability" INTEGER DEFAULT 0,
    "expected_close_date" DATE,
    "notes" TEXT,
    "lost_reason" TEXT,
    "assigned_to_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "industry" VARCHAR(100),
    "website" VARCHAR(500),
    "billing_email" VARCHAR(255),
    "billing_phone" VARCHAR(20),
    "billing_address" JSONB,
    "qbo_customer_id" VARCHAR(50),
    "tax_id" VARCHAR(50),
    "payment_terms" VARCHAR(50) NOT NULL DEFAULT 'NET30',
    "credit_limit" DECIMAL(12,2),
    "account_manager_id" UUID,
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "account_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "title" VARCHAR(100),
    "department" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_billing" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "lead_id" UUID,
    "account_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'prospecting',
    "probability" INTEGER,
    "expected_value" DECIMAL(12,2),
    "actual_value" DECIMAL(12,2),
    "expected_close_date" DATE,
    "actual_close_date" DATE,
    "description" TEXT,
    "assigned_to_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "default_square_feet" DECIMAL(10,2),
    "base_cleaning_time_minutes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "area_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" JSONB NOT NULL,
    "square_feet" DECIMAL(10,2),
    "building_type" VARCHAR(50),
    "access_instructions" TEXT,
    "parking_info" TEXT,
    "special_requirements" TEXT,
    "facility_manager_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "area_type_id" UUID NOT NULL,
    "name" VARCHAR(255),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "square_feet" DECIMAL(10,2),
    "condition_level" VARCHAR(20) NOT NULL DEFAULT 'good',
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cleaning_type" VARCHAR(50) NOT NULL,
    "area_type_id" UUID,
    "estimated_minutes" INTEGER NOT NULL,
    "difficulty_level" INTEGER NOT NULL DEFAULT 3,
    "required_equipment" JSONB NOT NULL DEFAULT '[]',
    "required_supplies" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "facility_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_tasks" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "area_id" UUID,
    "task_template_id" UUID,
    "custom_name" VARCHAR(255),
    "custom_instructions" TEXT,
    "estimated_minutes" INTEGER,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "cleaning_frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "condition_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "facility_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pricing_type" VARCHAR(20) NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "minimum_charge" DECIMAL(10,2),
    "square_foot_rate" DECIMAL(8,4),
    "difficulty_multiplier" DECIMAL(4,3) NOT NULL DEFAULT 1.0,
    "condition_multipliers" JSONB NOT NULL DEFAULT '{"excellent": 0.8, "good": 1.0, "fair": 1.3, "poor": 1.6}',
    "cleaning_type" VARCHAR(50),
    "area_type_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_overrides" (
    "id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "pricing_rule_id" UUID NOT NULL,
    "override_rate" DECIMAL(10,2) NOT NULL,
    "override_reason" TEXT NOT NULL,
    "effective_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE,
    "approved_by_user_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pricing_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabase_user_id_key" ON "users"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_sources_name_key" ON "lead_sources"("name");

-- CreateIndex
CREATE INDEX "lead_sources_is_active_idx" ON "lead_sources"("is_active");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_lead_source_id_idx" ON "leads"("lead_source_id");

-- CreateIndex
CREATE INDEX "leads_assigned_to_user_id_idx" ON "leads"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "leads_primary_email_idx" ON "leads"("primary_email");

-- CreateIndex
CREATE INDEX "leads_expected_close_date_idx" ON "leads"("expected_close_date");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_key" ON "accounts"("name");

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "accounts_account_manager_id_idx" ON "accounts"("account_manager_id");

-- CreateIndex
CREATE INDEX "accounts_qbo_customer_id_idx" ON "accounts"("qbo_customer_id");

-- CreateIndex
CREATE INDEX "contacts_account_id_idx" ON "contacts"("account_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_is_primary_idx" ON "contacts"("is_primary");

-- CreateIndex
CREATE INDEX "contacts_is_billing_idx" ON "contacts"("is_billing");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_account_id_is_primary_key" ON "contacts"("account_id", "is_primary");

-- CreateIndex
CREATE INDEX "opportunities_lead_id_idx" ON "opportunities"("lead_id");

-- CreateIndex
CREATE INDEX "opportunities_account_id_idx" ON "opportunities"("account_id");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_assigned_to_user_id_idx" ON "opportunities"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "opportunities_expected_close_date_idx" ON "opportunities"("expected_close_date");

-- CreateIndex
CREATE UNIQUE INDEX "area_types_name_key" ON "area_types"("name");

-- CreateIndex
CREATE INDEX "area_types_name_idx" ON "area_types"("name");

-- CreateIndex
CREATE INDEX "facilities_account_id_idx" ON "facilities"("account_id");

-- CreateIndex
CREATE INDEX "facilities_status_idx" ON "facilities"("status");

-- CreateIndex
CREATE INDEX "facilities_facility_manager_id_idx" ON "facilities"("facility_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_account_id_name_key" ON "facilities"("account_id", "name");

-- CreateIndex
CREATE INDEX "areas_facility_id_idx" ON "areas"("facility_id");

-- CreateIndex
CREATE INDEX "areas_area_type_id_idx" ON "areas"("area_type_id");

-- CreateIndex
CREATE INDEX "areas_condition_level_idx" ON "areas"("condition_level");

-- CreateIndex
CREATE UNIQUE INDEX "areas_facility_id_name_key" ON "areas"("facility_id", "name");

-- CreateIndex
CREATE INDEX "task_templates_cleaning_type_idx" ON "task_templates"("cleaning_type");

-- CreateIndex
CREATE INDEX "task_templates_area_type_id_idx" ON "task_templates"("area_type_id");

-- CreateIndex
CREATE INDEX "task_templates_facility_id_idx" ON "task_templates"("facility_id");

-- CreateIndex
CREATE INDEX "task_templates_is_active_idx" ON "task_templates"("is_active");

-- CreateIndex
CREATE INDEX "task_templates_is_global_idx" ON "task_templates"("is_global");

-- CreateIndex
CREATE INDEX "facility_tasks_facility_id_idx" ON "facility_tasks"("facility_id");

-- CreateIndex
CREATE INDEX "facility_tasks_area_id_idx" ON "facility_tasks"("area_id");

-- CreateIndex
CREATE INDEX "facility_tasks_task_template_id_idx" ON "facility_tasks"("task_template_id");

-- CreateIndex
CREATE INDEX "facility_tasks_cleaning_frequency_idx" ON "facility_tasks"("cleaning_frequency");

-- CreateIndex
CREATE INDEX "facility_tasks_priority_idx" ON "facility_tasks"("priority");

-- CreateIndex
CREATE INDEX "pricing_rules_pricing_type_idx" ON "pricing_rules"("pricing_type");

-- CreateIndex
CREATE INDEX "pricing_rules_cleaning_type_idx" ON "pricing_rules"("cleaning_type");

-- CreateIndex
CREATE INDEX "pricing_rules_area_type_id_idx" ON "pricing_rules"("area_type_id");

-- CreateIndex
CREATE INDEX "pricing_rules_is_active_idx" ON "pricing_rules"("is_active");

-- CreateIndex
CREATE INDEX "pricing_overrides_facility_id_idx" ON "pricing_overrides"("facility_id");

-- CreateIndex
CREATE INDEX "pricing_overrides_effective_date_idx" ON "pricing_overrides"("effective_date");

-- CreateIndex
CREATE INDEX "pricing_overrides_expiry_date_idx" ON "pricing_overrides"("expiry_date");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_account_manager_id_fkey" FOREIGN KEY ("account_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_facility_manager_id_fkey" FOREIGN KEY ("facility_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_area_type_id_fkey" FOREIGN KEY ("area_type_id") REFERENCES "area_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_area_type_id_fkey" FOREIGN KEY ("area_type_id") REFERENCES "area_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_tasks" ADD CONSTRAINT "facility_tasks_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_tasks" ADD CONSTRAINT "facility_tasks_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_tasks" ADD CONSTRAINT "facility_tasks_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_tasks" ADD CONSTRAINT "facility_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_area_type_id_fkey" FOREIGN KEY ("area_type_id") REFERENCES "area_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_pricing_rule_id_fkey" FOREIGN KEY ("pricing_rule_id") REFERENCES "pricing_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
