-- Add item category and default minutes on fixture types
ALTER TABLE "fixture_types"
  ADD COLUMN "category" VARCHAR(20) NOT NULL DEFAULT 'fixture',
  ADD COLUMN "default_minutes_per_item" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- Add minutes per item on area fixtures (now items)
ALTER TABLE "area_fixtures"
  ADD COLUMN "minutes_per_item" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- Area templates
CREATE TABLE "area_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "area_type_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "default_square_feet" DECIMAL(10,2),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "area_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "area_templates_area_type_id_key" ON "area_templates" ("area_type_id");
CREATE INDEX "area_templates_area_type_id_idx" ON "area_templates" ("area_type_id");

ALTER TABLE "area_templates"
  ADD CONSTRAINT "area_templates_area_type_id_fkey"
  FOREIGN KEY ("area_type_id") REFERENCES "area_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "area_templates"
  ADD CONSTRAINT "area_templates_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Area template items
CREATE TABLE "area_template_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "area_template_id" UUID NOT NULL,
  "fixture_type_id" UUID NOT NULL,
  "default_count" INTEGER NOT NULL DEFAULT 0,
  "minutes_per_item" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "area_template_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "area_template_items_area_template_id_fixture_type_id_key"
  ON "area_template_items" ("area_template_id", "fixture_type_id");
CREATE INDEX "area_template_items_area_template_id_idx" ON "area_template_items" ("area_template_id");
CREATE INDEX "area_template_items_fixture_type_id_idx" ON "area_template_items" ("fixture_type_id");

ALTER TABLE "area_template_items"
  ADD CONSTRAINT "area_template_items_area_template_id_fkey"
  FOREIGN KEY ("area_template_id") REFERENCES "area_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "area_template_items"
  ADD CONSTRAINT "area_template_items_fixture_type_id_fkey"
  FOREIGN KEY ("fixture_type_id") REFERENCES "fixture_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Area template tasks
CREATE TABLE "area_template_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "area_template_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "base_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "per_sqft_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "per_unit_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "per_room_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "area_template_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "area_template_tasks_area_template_id_idx" ON "area_template_tasks" ("area_template_id");

ALTER TABLE "area_template_tasks"
  ADD CONSTRAINT "area_template_tasks_area_template_id_fkey"
  FOREIGN KEY ("area_template_id") REFERENCES "area_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
