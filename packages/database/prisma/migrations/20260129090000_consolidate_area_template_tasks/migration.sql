-- Consolidate area template tasks to reference task templates
ALTER TABLE "area_template_tasks"
  ADD COLUMN "task_template_id" UUID;

ALTER TABLE "area_template_tasks"
  ALTER COLUMN "name" DROP NOT NULL,
  ALTER COLUMN "base_minutes" DROP NOT NULL,
  ALTER COLUMN "per_sqft_minutes" DROP NOT NULL,
  ALTER COLUMN "per_unit_minutes" DROP NOT NULL,
  ALTER COLUMN "per_room_minutes" DROP NOT NULL;

CREATE INDEX "area_template_tasks_area_template_id_sort_order_idx"
  ON "area_template_tasks" ("area_template_id", "sort_order");

CREATE INDEX "area_template_tasks_task_template_id_idx"
  ON "area_template_tasks" ("task_template_id");

ALTER TABLE "area_template_tasks"
  ADD CONSTRAINT "area_template_tasks_task_template_id_fkey"
  FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
