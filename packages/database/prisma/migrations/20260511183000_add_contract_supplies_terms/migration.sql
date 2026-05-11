ALTER TABLE "contracts"
  ADD COLUMN "equipment_provided_by" VARCHAR(20) NOT NULL DEFAULT 'company',
  ADD COLUMN "chemicals_provided_by" VARCHAR(20) NOT NULL DEFAULT 'company',
  ADD COLUMN "approved_chemical_notes" TEXT,
  ADD COLUMN "restricted_chemical_notes" TEXT,
  ADD COLUMN "equipment_notes" TEXT,
  ADD COLUMN "requires_special_equipment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "special_equipment_notes" TEXT,
  ADD COLUMN "sds_required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "storage_allowed_on_site" BOOLEAN NOT NULL DEFAULT false;
