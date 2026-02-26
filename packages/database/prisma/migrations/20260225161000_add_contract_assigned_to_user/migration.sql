-- Add assigned internal employee to contracts
ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "assigned_to_user_id" UUID;

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "contracts_assigned_to_user_id_idx"
  ON "contracts"("assigned_to_user_id");
