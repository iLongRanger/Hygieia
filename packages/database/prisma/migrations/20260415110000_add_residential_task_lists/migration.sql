ALTER TABLE "residential_properties"
ADD COLUMN "default_tasks" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "residential_quotes"
ADD COLUMN "included_tasks" JSONB NOT NULL DEFAULT '[]';
