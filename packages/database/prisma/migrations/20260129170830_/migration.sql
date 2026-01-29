-- AlterTable
ALTER TABLE "area_template_items" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "area_template_tasks" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "base_minutes" DROP DEFAULT,
ALTER COLUMN "per_sqft_minutes" DROP DEFAULT,
ALTER COLUMN "per_unit_minutes" DROP DEFAULT,
ALTER COLUMN "per_room_minutes" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "area_templates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;
