CREATE TABLE "opportunities" (
  "id" UUID NOT NULL,
  "lead_id" UUID,
  "account_id" UUID,
  "primary_contact_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'lead',
  "source" VARCHAR(100),
  "estimated_value" DECIMAL(12, 2),
  "probability" INTEGER DEFAULT 0,
  "expected_close_date" DATE,
  "lost_reason" TEXT,
  "owner_user_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "won_at" TIMESTAMPTZ(6),
  "lost_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),

  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments"
ADD COLUMN "opportunity_id" UUID;

ALTER TABLE "proposals"
ADD COLUMN "opportunity_id" UUID;

ALTER TABLE "contracts"
ADD COLUMN "opportunity_id" UUID;

CREATE INDEX "opportunities_lead_id_idx" ON "opportunities"("lead_id");
CREATE INDEX "opportunities_account_id_idx" ON "opportunities"("account_id");
CREATE INDEX "opportunities_primary_contact_id_idx" ON "opportunities"("primary_contact_id");
CREATE INDEX "opportunities_owner_user_id_idx" ON "opportunities"("owner_user_id");
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");
CREATE INDEX "opportunities_expected_close_date_idx" ON "opportunities"("expected_close_date");

CREATE INDEX "appointments_opportunity_id_idx" ON "appointments"("opportunity_id");
CREATE INDEX "proposals_opportunity_id_idx" ON "proposals"("opportunity_id");
CREATE INDEX "contracts_opportunity_id_idx" ON "contracts"("opportunity_id");

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_lead_id_fkey"
FOREIGN KEY ("lead_id") REFERENCES "leads"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_primary_contact_id_fkey"
FOREIGN KEY ("primary_contact_id") REFERENCES "contacts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opportunities"
ADD CONSTRAINT "opportunities_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_opportunity_id_fkey"
FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposals"
ADD CONSTRAINT "proposals_opportunity_id_fkey"
FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_opportunity_id_fkey"
FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
