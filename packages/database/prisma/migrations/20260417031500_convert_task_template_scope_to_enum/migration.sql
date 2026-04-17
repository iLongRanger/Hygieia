CREATE TYPE "TaskTemplateScope" AS ENUM ('residential', 'commercial', 'both');

ALTER TABLE "task_templates"
ALTER COLUMN "scope" DROP DEFAULT,
ALTER COLUMN "scope" TYPE "TaskTemplateScope" USING ("scope"::"TaskTemplateScope"),
ALTER COLUMN "scope" SET DEFAULT 'both';
