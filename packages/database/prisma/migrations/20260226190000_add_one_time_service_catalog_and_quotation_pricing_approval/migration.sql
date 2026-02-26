ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "pricing_approval_status" VARCHAR(20) NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS "pricing_approval_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "pricing_approval_requested_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_approval_requested_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_approved_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "pricing_approval_rejected_at" TIMESTAMPTZ(6);

ALTER TABLE "quotation_services"
  ADD COLUMN IF NOT EXISTS "catalog_item_id" UUID,
  ADD COLUMN IF NOT EXISTS "pricing_meta" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "one_time_service_catalog_items" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "service_type" VARCHAR(50) NOT NULL DEFAULT 'custom',
  "unit_type" VARCHAR(30) NOT NULL,
  "base_rate" DECIMAL(12,2) NOT NULL,
  "default_quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "minimum_charge" DECIMAL(12,2),
  "max_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 10,
  "requires_schedule" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "one_time_service_catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "one_time_service_catalog_addons" (
  "id" UUID NOT NULL,
  "catalog_item_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "default_quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "one_time_service_catalog_addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "one_time_service_catalog_items_code_key" ON "one_time_service_catalog_items" ("code");
CREATE INDEX IF NOT EXISTS "one_time_service_catalog_items_is_active_idx" ON "one_time_service_catalog_items" ("is_active");
CREATE INDEX IF NOT EXISTS "one_time_service_catalog_items_service_type_idx" ON "one_time_service_catalog_items" ("service_type");
CREATE INDEX IF NOT EXISTS "one_time_service_catalog_items_unit_type_idx" ON "one_time_service_catalog_items" ("unit_type");

CREATE UNIQUE INDEX IF NOT EXISTS "one_time_service_catalog_addons_catalog_item_id_code_key"
  ON "one_time_service_catalog_addons" ("catalog_item_id", "code");
CREATE INDEX IF NOT EXISTS "one_time_service_catalog_addons_catalog_item_id_idx"
  ON "one_time_service_catalog_addons" ("catalog_item_id");
CREATE INDEX IF NOT EXISTS "one_time_service_catalog_addons_is_active_idx"
  ON "one_time_service_catalog_addons" ("is_active");

CREATE INDEX IF NOT EXISTS "quotations_pricing_approval_status_idx"
  ON "quotations" ("pricing_approval_status");
CREATE INDEX IF NOT EXISTS "quotations_pricing_approval_requested_by_user_id_idx"
  ON "quotations" ("pricing_approval_requested_by_user_id");
CREATE INDEX IF NOT EXISTS "quotations_pricing_approved_by_user_id_idx"
  ON "quotations" ("pricing_approved_by_user_id");

CREATE INDEX IF NOT EXISTS "quotation_services_catalog_item_id_idx"
  ON "quotation_services" ("catalog_item_id");

ALTER TABLE "quotations"
  DROP CONSTRAINT IF EXISTS "quotations_pricing_approval_requested_by_user_id_fkey",
  ADD CONSTRAINT "quotations_pricing_approval_requested_by_user_id_fkey"
  FOREIGN KEY ("pricing_approval_requested_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotations"
  DROP CONSTRAINT IF EXISTS "quotations_pricing_approved_by_user_id_fkey",
  ADD CONSTRAINT "quotations_pricing_approved_by_user_id_fkey"
  FOREIGN KEY ("pricing_approved_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotation_services"
  DROP CONSTRAINT IF EXISTS "quotation_services_catalog_item_id_fkey",
  ADD CONSTRAINT "quotation_services_catalog_item_id_fkey"
  FOREIGN KEY ("catalog_item_id") REFERENCES "one_time_service_catalog_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "one_time_service_catalog_items"
  DROP CONSTRAINT IF EXISTS "one_time_service_catalog_items_created_by_user_id_fkey",
  ADD CONSTRAINT "one_time_service_catalog_items_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "one_time_service_catalog_addons"
  DROP CONSTRAINT IF EXISTS "one_time_service_catalog_addons_catalog_item_id_fkey",
  ADD CONSTRAINT "one_time_service_catalog_addons_catalog_item_id_fkey"
  FOREIGN KEY ("catalog_item_id") REFERENCES "one_time_service_catalog_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
