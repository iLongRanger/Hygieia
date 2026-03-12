ALTER TABLE "opportunities"
ADD COLUMN "facility_id" UUID;

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_facility_id_fkey"
FOREIGN KEY ("facility_id") REFERENCES "facilities"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "opportunities_facility_id_idx" ON "opportunities"("facility_id");
