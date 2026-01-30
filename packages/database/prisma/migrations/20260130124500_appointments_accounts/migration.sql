-- Appointments support for account-based visits/inspections

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "account_id" UUID;
ALTER TABLE "appointments" ALTER COLUMN "lead_id" DROP NOT NULL;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "appointments_account_id_idx" ON "appointments"("account_id");
