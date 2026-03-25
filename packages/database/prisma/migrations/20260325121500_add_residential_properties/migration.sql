CREATE TABLE "residential_properties" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "service_address" JSONB NOT NULL,
  "home_profile" JSONB NOT NULL,
  "access_notes" TEXT,
  "parking_access" TEXT,
  "entry_notes" TEXT,
  "pets" BOOLEAN,
  "is_primary" BOOLEAN NOT NULL DEFAULT true,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "residential_properties_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "facilities"
ADD COLUMN "residential_property_id" UUID;

ALTER TABLE "residential_quotes"
ADD COLUMN "property_id" UUID;

ALTER TABLE "contracts"
ADD COLUMN "residential_property_id" UUID;

INSERT INTO "residential_properties" (
  "id",
  "account_id",
  "name",
  "service_address",
  "home_profile",
  "access_notes",
  "parking_access",
  "entry_notes",
  "pets",
  "is_primary",
  "status",
  "created_by_user_id",
  "created_at",
  "updated_at",
  "archived_at"
)
SELECT
  gen_random_uuid(),
  a."id",
  CASE
    WHEN COALESCE(NULLIF(TRIM(a."name"), ''), '') = '' THEN 'Primary Residence'
    ELSE a."name" || ' Primary Residence'
  END,
  COALESCE(a."service_address", '{}'::jsonb),
  COALESCE(a."residential_profile", '{}'::jsonb),
  NULL,
  NULLIF(TRIM(COALESCE(a."residential_profile"->>'parkingAccess', '')), ''),
  NULLIF(TRIM(COALESCE(a."residential_profile"->>'entryNotes', '')), ''),
  CASE
    WHEN a."residential_profile" ? 'hasPets' THEN (a."residential_profile"->>'hasPets')::boolean
    ELSE NULL
  END,
  true,
  CASE
    WHEN a."archived_at" IS NULL THEN 'active'
    ELSE 'archived'
  END,
  a."created_by_user_id",
  a."created_at",
  a."updated_at",
  a."archived_at"
FROM "accounts" a
WHERE a."type" = 'residential';

UPDATE "residential_quotes" q
SET "property_id" = rp."id"
FROM "residential_properties" rp
WHERE rp."account_id" = q."account_id"
  AND rp."is_primary" = true
  AND q."property_id" IS NULL;

UPDATE "contracts" c
SET "residential_property_id" = rp."id"
FROM "residential_properties" rp
WHERE rp."account_id" = c."account_id"
  AND rp."is_primary" = true
  AND c."service_category" = 'residential'
  AND c."residential_property_id" IS NULL;

UPDATE "facilities" f
SET "residential_property_id" = rp."id"
FROM "residential_properties" rp
WHERE rp."account_id" = f."account_id"
  AND rp."is_primary" = true
  AND f."residential_property_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "accounts" a
    WHERE a."id" = f."account_id"
      AND a."type" = 'residential'
  );

ALTER TABLE "residential_quotes"
ALTER COLUMN "property_id" SET NOT NULL;

CREATE UNIQUE INDEX "residential_properties_account_id_name_key"
ON "residential_properties"("account_id", "name");

CREATE UNIQUE INDEX "residential_properties_account_id_primary_key"
ON "residential_properties"("account_id")
WHERE "is_primary" = true;

CREATE INDEX "residential_properties_account_id_idx"
ON "residential_properties"("account_id");

CREATE INDEX "residential_properties_is_primary_idx"
ON "residential_properties"("is_primary");

CREATE INDEX "residential_properties_status_idx"
ON "residential_properties"("status");

CREATE INDEX "facilities_residential_property_id_idx"
ON "facilities"("residential_property_id");

CREATE INDEX "residential_quotes_property_id_idx"
ON "residential_quotes"("property_id");

CREATE INDEX "contracts_residential_property_id_idx"
ON "contracts"("residential_property_id");

ALTER TABLE "residential_properties"
ADD CONSTRAINT "residential_properties_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "residential_properties"
ADD CONSTRAINT "residential_properties_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facilities"
ADD CONSTRAINT "facilities_residential_property_id_fkey"
FOREIGN KEY ("residential_property_id") REFERENCES "residential_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "residential_quotes"
ADD CONSTRAINT "residential_quotes_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "residential_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_residential_property_id_fkey"
FOREIGN KEY ("residential_property_id") REFERENCES "residential_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
