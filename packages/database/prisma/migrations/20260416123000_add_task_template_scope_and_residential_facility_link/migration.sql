-- Add task template scope for residential/commercial filtering
ALTER TABLE "task_templates"
ADD COLUMN "scope" VARCHAR(20) NOT NULL DEFAULT 'both';

CREATE INDEX "task_templates_scope_idx" ON "task_templates"("scope");

-- Enforce one operational facility per residential property
CREATE UNIQUE INDEX "facilities_residential_property_id_key"
ON "facilities"("residential_property_id");
