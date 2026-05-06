CREATE TABLE "photo_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "facility_id" UUID,
  "appointment_id" UUID,
  "inspection_id" UUID,
  "job_id" UUID,
  "category" VARCHAR(50) NOT NULL DEFAULT 'general',
  "caption" TEXT,
  "bucket" VARCHAR(255) NOT NULL,
  "object_key" TEXT NOT NULL,
  "original_filename" VARCHAR(255),
  "content_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "uploaded_by_user_id" UUID NOT NULL,
  "uploaded_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),

  CONSTRAINT "photo_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "photo_assets_single_parent_chk" CHECK (
    (
      CASE WHEN "facility_id" IS NULL THEN 0 ELSE 1 END +
      CASE WHEN "appointment_id" IS NULL THEN 0 ELSE 1 END +
      CASE WHEN "inspection_id" IS NULL THEN 0 ELSE 1 END +
      CASE WHEN "job_id" IS NULL THEN 0 ELSE 1 END
    ) = 1
  )
);

CREATE UNIQUE INDEX "photo_assets_object_key_key" ON "photo_assets"("object_key");
CREATE INDEX "photo_assets_facility_id_idx" ON "photo_assets"("facility_id");
CREATE INDEX "photo_assets_appointment_id_idx" ON "photo_assets"("appointment_id");
CREATE INDEX "photo_assets_inspection_id_idx" ON "photo_assets"("inspection_id");
CREATE INDEX "photo_assets_job_id_idx" ON "photo_assets"("job_id");
CREATE INDEX "photo_assets_uploaded_by_user_id_idx" ON "photo_assets"("uploaded_by_user_id");
CREATE INDEX "photo_assets_category_idx" ON "photo_assets"("category");
CREATE INDEX "photo_assets_status_idx" ON "photo_assets"("status");
CREATE INDEX "photo_assets_created_at_idx" ON "photo_assets"("created_at");

ALTER TABLE "photo_assets"
  ADD CONSTRAINT "photo_assets_facility_id_fkey"
  FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_assets"
  ADD CONSTRAINT "photo_assets_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_assets"
  ADD CONSTRAINT "photo_assets_inspection_id_fkey"
  FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_assets"
  ADD CONSTRAINT "photo_assets_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "photo_assets"
  ADD CONSTRAINT "photo_assets_uploaded_by_user_id_fkey"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
