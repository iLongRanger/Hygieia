-- Inspection workflow: corrective actions + signoffs

CREATE TABLE IF NOT EXISTS "inspection_corrective_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspection_id" UUID NOT NULL,
  "inspection_item_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "severity" VARCHAR(20) NOT NULL DEFAULT 'major',
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "due_date" DATE,
  "assignee_user_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "resolved_by_user_id" UUID,
  "resolved_at" TIMESTAMPTZ(6),
  "resolution_notes" TEXT,
  "verified_by_user_id" UUID,
  "verified_at" TIMESTAMPTZ(6),
  "follow_up_inspection_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_corrective_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inspection_signoffs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "inspection_id" UUID NOT NULL,
  "signer_type" VARCHAR(20) NOT NULL,
  "signer_name" VARCHAR(255) NOT NULL,
  "signer_title" VARCHAR(255),
  "comments" TEXT,
  "signed_by_user_id" UUID,
  "signed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspection_signoffs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inspection_corrective_actions_inspection_id_idx"
  ON "inspection_corrective_actions" ("inspection_id");
CREATE INDEX IF NOT EXISTS "inspection_corrective_actions_inspection_item_id_idx"
  ON "inspection_corrective_actions" ("inspection_item_id");
CREATE INDEX IF NOT EXISTS "inspection_corrective_actions_status_idx"
  ON "inspection_corrective_actions" ("status");
CREATE INDEX IF NOT EXISTS "inspection_corrective_actions_severity_idx"
  ON "inspection_corrective_actions" ("severity");
CREATE INDEX IF NOT EXISTS "inspection_corrective_actions_due_date_idx"
  ON "inspection_corrective_actions" ("due_date");
CREATE INDEX IF NOT EXISTS "inspection_signoffs_inspection_id_idx"
  ON "inspection_signoffs" ("inspection_id");
CREATE INDEX IF NOT EXISTS "inspection_signoffs_signer_type_idx"
  ON "inspection_signoffs" ("signer_type");
CREATE INDEX IF NOT EXISTS "inspection_signoffs_signed_at_idx"
  ON "inspection_signoffs" ("signed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_inspection_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_inspection_id_fkey"
      FOREIGN KEY ("inspection_id")
      REFERENCES "inspections"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_inspection_item_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_inspection_item_id_fkey"
      FOREIGN KEY ("inspection_item_id")
      REFERENCES "inspection_items"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_assignee_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_assignee_user_id_fkey"
      FOREIGN KEY ("assignee_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_resolved_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_resolved_by_user_id_fkey"
      FOREIGN KEY ("resolved_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_corrective_actions_verified_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_corrective_actions"
      ADD CONSTRAINT "inspection_corrective_actions_verified_by_user_id_fkey"
      FOREIGN KEY ("verified_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_signoffs_inspection_id_fkey'
  ) THEN
    ALTER TABLE "inspection_signoffs"
      ADD CONSTRAINT "inspection_signoffs_inspection_id_fkey"
      FOREIGN KEY ("inspection_id")
      REFERENCES "inspections"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_signoffs_signed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_signoffs"
      ADD CONSTRAINT "inspection_signoffs_signed_by_user_id_fkey"
      FOREIGN KEY ("signed_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
