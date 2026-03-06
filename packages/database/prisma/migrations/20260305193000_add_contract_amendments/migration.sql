CREATE TABLE "contract_amendments" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "amendment_number" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "amendment_type" VARCHAR(30) NOT NULL DEFAULT 'scope_change',
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "reason" TEXT,
    "effective_date" DATE NOT NULL,
    "pricing_plan_id" UUID,
    "old_monthly_value" DECIMAL(12,2) NOT NULL,
    "new_monthly_value" DECIMAL(12,2),
    "monthly_delta" DECIMAL(12,2),
    "old_service_frequency" VARCHAR(30),
    "new_service_frequency" VARCHAR(30),
    "old_service_schedule" JSONB,
    "new_service_schedule" JSONB,
    "pricing_snapshot" JSONB,
    "approved_at" TIMESTAMPTZ(6),
    "applied_at" TIMESTAMPTZ(6),
    "canceled_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_reason" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "approved_by_user_id" UUID,
    "applied_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMPTZ(6),
    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_amendment_scope_snapshots" (
    "id" UUID NOT NULL,
    "amendment_id" UUID NOT NULL,
    "snapshot_type" VARCHAR(20) NOT NULL,
    "scope_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendment_scope_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_amendment_activities" (
    "id" UUID NOT NULL,
    "amendment_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendment_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contract_amendments_contract_id_amendment_number_key"
    ON "contract_amendments"("contract_id", "amendment_number");

CREATE INDEX "contract_amendments_contract_id_idx" ON "contract_amendments"("contract_id");
CREATE INDEX "contract_amendments_status_idx" ON "contract_amendments"("status");
CREATE INDEX "contract_amendments_effective_date_idx" ON "contract_amendments"("effective_date");
CREATE INDEX "contract_amendments_created_by_user_id_idx" ON "contract_amendments"("created_by_user_id");
CREATE INDEX "contract_amendments_approved_by_user_id_idx" ON "contract_amendments"("approved_by_user_id");
CREATE INDEX "contract_amendments_applied_by_user_id_idx" ON "contract_amendments"("applied_by_user_id");
CREATE INDEX "contract_amendments_created_at_idx" ON "contract_amendments"("created_at");

CREATE INDEX "contract_amendment_scope_snapshots_amendment_id_idx"
    ON "contract_amendment_scope_snapshots"("amendment_id");
CREATE INDEX "contract_amendment_scope_snapshots_snapshot_type_idx"
    ON "contract_amendment_scope_snapshots"("snapshot_type");
CREATE INDEX "contract_amendment_scope_snapshots_created_at_idx"
    ON "contract_amendment_scope_snapshots"("created_at");

CREATE INDEX "contract_amendment_activities_amendment_id_idx"
    ON "contract_amendment_activities"("amendment_id");
CREATE INDEX "contract_amendment_activities_action_idx"
    ON "contract_amendment_activities"("action");
CREATE INDEX "contract_amendment_activities_created_at_idx"
    ON "contract_amendment_activities"("created_at");

ALTER TABLE "contract_amendments"
    ADD CONSTRAINT "contract_amendments_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_amendments"
    ADD CONSTRAINT "contract_amendments_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_amendments"
    ADD CONSTRAINT "contract_amendments_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contract_amendments"
    ADD CONSTRAINT "contract_amendments_applied_by_user_id_fkey"
    FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contract_amendment_scope_snapshots"
    ADD CONSTRAINT "contract_amendment_scope_snapshots_amendment_id_fkey"
    FOREIGN KEY ("amendment_id") REFERENCES "contract_amendments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_amendment_activities"
    ADD CONSTRAINT "contract_amendment_activities_amendment_id_fkey"
    FOREIGN KEY ("amendment_id") REFERENCES "contract_amendments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_amendment_activities"
    ADD CONSTRAINT "contract_amendment_activities_performed_by_user_id_fkey"
    FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
