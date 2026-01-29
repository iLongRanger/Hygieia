-- AlterTable
ALTER TABLE "area_fixtures" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "facility_task_fixture_minutes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fixture_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "task_fixture_minutes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "facility_task_fixture_minutes_facility_task_id_fixture_type_id_" RENAME TO "facility_task_fixture_minutes_facility_task_id_fixture_type_key";
