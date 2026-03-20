-- Create residential pricing plans
CREATE TABLE "residential_pricing_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "strategy_key" VARCHAR(40) NOT NULL DEFAULT 'residential_flat_v1',
    "settings" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "residential_pricing_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "residential_pricing_plans_name_key" ON "residential_pricing_plans"("name");
CREATE INDEX "residential_pricing_plans_is_active_idx" ON "residential_pricing_plans"("is_active");
CREATE INDEX "residential_pricing_plans_is_default_idx" ON "residential_pricing_plans"("is_default");
CREATE INDEX "residential_pricing_plans_strategy_key_idx" ON "residential_pricing_plans"("strategy_key");

ALTER TABLE "residential_pricing_plans"
ADD CONSTRAINT "residential_pricing_plans_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create residential quotes
CREATE TABLE "residential_quotes" (
    "id" UUID NOT NULL,
    "quote_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "service_type" VARCHAR(40) NOT NULL,
    "frequency" VARCHAR(30) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "home_address" JSONB,
    "home_profile" JSONB NOT NULL,
    "pricing_plan_id" UUID,
    "settings_snapshot" JSONB,
    "price_breakdown" JSONB,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "add_on_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recurring_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "first_clean_surcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_hours" DECIMAL(10,2),
    "confidence_level" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "manual_review_required" BOOLEAN NOT NULL DEFAULT false,
    "manual_review_reasons" JSONB NOT NULL DEFAULT '[]',
    "preferred_start_date" DATE,
    "notes" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "decline_reason" TEXT,
    "converted_at" TIMESTAMPTZ(6),
    "converted_contract_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "residential_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "residential_quotes_quote_number_key" ON "residential_quotes"("quote_number");
CREATE INDEX "residential_quotes_status_idx" ON "residential_quotes"("status");
CREATE INDEX "residential_quotes_service_type_idx" ON "residential_quotes"("service_type");
CREATE INDEX "residential_quotes_frequency_idx" ON "residential_quotes"("frequency");
CREATE INDEX "residential_quotes_pricing_plan_id_idx" ON "residential_quotes"("pricing_plan_id");
CREATE INDEX "residential_quotes_created_by_user_id_idx" ON "residential_quotes"("created_by_user_id");
CREATE INDEX "residential_quotes_customer_email_idx" ON "residential_quotes"("customer_email");
CREATE INDEX "residential_quotes_converted_contract_id_idx" ON "residential_quotes"("converted_contract_id");
CREATE INDEX "residential_quotes_created_at_idx" ON "residential_quotes"("created_at");

ALTER TABLE "residential_quotes"
ADD CONSTRAINT "residential_quotes_pricing_plan_id_fkey"
FOREIGN KEY ("pricing_plan_id") REFERENCES "residential_pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "residential_quotes"
ADD CONSTRAINT "residential_quotes_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create residential quote add-ons
CREATE TABLE "residential_quote_add_ons" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricing_type" VARCHAR(20) NOT NULL,
    "unit_label" VARCHAR(50),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "residential_quote_add_ons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "residential_quote_add_ons_quote_id_idx" ON "residential_quote_add_ons"("quote_id");
CREATE INDEX "residential_quote_add_ons_code_idx" ON "residential_quote_add_ons"("code");
CREATE INDEX "residential_quote_add_ons_sort_order_idx" ON "residential_quote_add_ons"("sort_order");

ALTER TABLE "residential_quote_add_ons"
ADD CONSTRAINT "residential_quote_add_ons_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "residential_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend contracts for residential conversion
ALTER TABLE "contracts"
ADD COLUMN "service_category" VARCHAR(20) NOT NULL DEFAULT 'commercial',
ADD COLUMN "residential_service_type" VARCHAR(40),
ADD COLUMN "residential_frequency" VARCHAR(30),
ADD COLUMN "home_profile_snapshot" JSONB,
ADD COLUMN "quote_source_type" VARCHAR(30),
ADD COLUMN "quote_source_id" UUID;

CREATE INDEX "contracts_service_category_idx" ON "contracts"("service_category");
CREATE INDEX "contracts_quote_source_id_idx" ON "contracts"("quote_source_id");
