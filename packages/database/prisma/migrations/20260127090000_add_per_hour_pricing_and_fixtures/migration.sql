-- Per-hour pricing fields and fixtures normalization

-- Areas: room/unit counts and traffic level
ALTER TABLE "areas"
  ADD COLUMN "room_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unit_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "traffic_level" VARCHAR(20) NOT NULL DEFAULT 'medium';

CREATE INDEX "areas_traffic_level_idx" ON "areas" ("traffic_level");

-- Task templates: per-hour fields
ALTER TABLE "task_templates"
  ADD COLUMN "base_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN "per_sqft_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN "per_unit_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN "per_room_minutes" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- Facility tasks: per-hour overrides
ALTER TABLE "facility_tasks"
  ADD COLUMN "base_minutes_override" DECIMAL(10,4),
  ADD COLUMN "per_sqft_minutes_override" DECIMAL(10,4),
  ADD COLUMN "per_unit_minutes_override" DECIMAL(10,4),
  ADD COLUMN "per_room_minutes_override" DECIMAL(10,4);

-- Pricing settings: hourly rate and traffic multipliers
ALTER TABLE "pricing_settings"
  ADD COLUMN "hourly_rate" DECIMAL(8,2) NOT NULL DEFAULT 35.00,
  ADD COLUMN "traffic_multipliers" JSONB NOT NULL DEFAULT '{"low": 0.9, "medium": 1.0, "high": 1.15}';

-- Fixture types
CREATE TABLE "fixture_types" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fixture_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fixture_types_name_key" ON "fixture_types" ("name");
CREATE INDEX "fixture_types_is_active_idx" ON "fixture_types" ("is_active");

-- Area fixtures (counts per area)
CREATE TABLE "area_fixtures" (
  "id" UUID NOT NULL,
  "area_id" UUID NOT NULL,
  "fixture_type_id" UUID NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "area_fixtures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "area_fixtures_area_id_fixture_type_id_key"
  ON "area_fixtures" ("area_id", "fixture_type_id");
CREATE INDEX "area_fixtures_area_id_idx" ON "area_fixtures" ("area_id");
CREATE INDEX "area_fixtures_fixture_type_id_idx" ON "area_fixtures" ("fixture_type_id");

ALTER TABLE "area_fixtures"
  ADD CONSTRAINT "area_fixtures_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "area_fixtures"
  ADD CONSTRAINT "area_fixtures_fixture_type_id_fkey"
  FOREIGN KEY ("fixture_type_id") REFERENCES "fixture_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task fixture minutes (per template)
CREATE TABLE "task_fixture_minutes" (
  "id" UUID NOT NULL,
  "task_template_id" UUID NOT NULL,
  "fixture_type_id" UUID NOT NULL,
  "minutes_per_fixture" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_fixture_minutes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_fixture_minutes_task_template_id_fixture_type_id_key"
  ON "task_fixture_minutes" ("task_template_id", "fixture_type_id");
CREATE INDEX "task_fixture_minutes_task_template_id_idx" ON "task_fixture_minutes" ("task_template_id");
CREATE INDEX "task_fixture_minutes_fixture_type_id_idx" ON "task_fixture_minutes" ("fixture_type_id");

ALTER TABLE "task_fixture_minutes"
  ADD CONSTRAINT "task_fixture_minutes_task_template_id_fkey"
  FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_fixture_minutes"
  ADD CONSTRAINT "task_fixture_minutes_fixture_type_id_fkey"
  FOREIGN KEY ("fixture_type_id") REFERENCES "fixture_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Facility task fixture minutes (overrides)
CREATE TABLE "facility_task_fixture_minutes" (
  "id" UUID NOT NULL,
  "facility_task_id" UUID NOT NULL,
  "fixture_type_id" UUID NOT NULL,
  "minutes_per_fixture" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "facility_task_fixture_minutes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facility_task_fixture_minutes_facility_task_id_fixture_type_id_key"
  ON "facility_task_fixture_minutes" ("facility_task_id", "fixture_type_id");
CREATE INDEX "facility_task_fixture_minutes_facility_task_id_idx"
  ON "facility_task_fixture_minutes" ("facility_task_id");
CREATE INDEX "facility_task_fixture_minutes_fixture_type_id_idx"
  ON "facility_task_fixture_minutes" ("fixture_type_id");

ALTER TABLE "facility_task_fixture_minutes"
  ADD CONSTRAINT "facility_task_fixture_minutes_facility_task_id_fkey"
  FOREIGN KEY ("facility_task_id") REFERENCES "facility_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facility_task_fixture_minutes"
  ADD CONSTRAINT "facility_task_fixture_minutes_fixture_type_id_fkey"
  FOREIGN KEY ("fixture_type_id") REFERENCES "fixture_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
