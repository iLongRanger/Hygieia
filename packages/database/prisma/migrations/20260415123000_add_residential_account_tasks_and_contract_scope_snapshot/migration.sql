ALTER TABLE "accounts"
ADD COLUMN "residential_task_library" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "contracts"
ADD COLUMN "scope_tasks_snapshot" JSONB;

UPDATE "contracts" AS c
SET "scope_tasks_snapshot" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "residential_quotes" AS rq
    WHERE rq."id" = c."quote_source_id"
      AND rq."included_tasks" IS NOT NULL
      AND jsonb_array_length(rq."included_tasks") > 0
  ) THEN (
    SELECT rq."included_tasks"
    FROM "residential_quotes" AS rq
    WHERE rq."id" = c."quote_source_id"
  )
  WHEN EXISTS (
    SELECT 1
    FROM "residential_properties" AS rp
    WHERE rp."id" = c."residential_property_id"
      AND rp."default_tasks" IS NOT NULL
      AND jsonb_array_length(rp."default_tasks") > 0
  ) THEN (
    SELECT rp."default_tasks"
    FROM "residential_properties" AS rp
    WHERE rp."id" = c."residential_property_id"
  )
  WHEN a."residential_task_library" IS NOT NULL AND jsonb_array_length(a."residential_task_library") > 0 THEN a."residential_task_library"
  ELSE '[]'::jsonb
END
FROM "accounts" AS a
WHERE c."account_id" = a."id"
  AND c."service_category" = 'residential';
