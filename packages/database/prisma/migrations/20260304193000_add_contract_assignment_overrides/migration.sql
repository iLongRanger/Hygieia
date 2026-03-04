ALTER TABLE "contracts"
  ADD COLUMN "pending_assigned_team_id" UUID,
  ADD COLUMN "pending_assigned_to_user_id" UUID,
  ADD COLUMN "pending_subcontractor_tier" VARCHAR(20),
  ADD COLUMN "assignment_override_effective_date" DATE,
  ADD COLUMN "assignment_override_set_by_user_id" UUID,
  ADD COLUMN "assignment_override_set_at" TIMESTAMPTZ(6);

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_pending_assigned_team_id_fkey"
    FOREIGN KEY ("pending_assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "contracts_pending_assigned_to_user_id_fkey"
    FOREIGN KEY ("pending_assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "contracts_assignment_override_set_by_user_id_fkey"
    FOREIGN KEY ("assignment_override_set_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "contracts_pending_assigned_team_id_idx"
  ON "contracts"("pending_assigned_team_id");

CREATE INDEX "contracts_pending_assigned_to_user_id_idx"
  ON "contracts"("pending_assigned_to_user_id");

CREATE INDEX "contracts_assignment_override_effective_date_idx"
  ON "contracts"("assignment_override_effective_date");

CREATE INDEX "contracts_assignment_override_set_by_user_id_idx"
  ON "contracts"("assignment_override_set_by_user_id");
