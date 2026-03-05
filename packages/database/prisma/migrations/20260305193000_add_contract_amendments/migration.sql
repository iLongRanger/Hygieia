CREATE TABLE "contract_amendments" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "effective_date" DATE NOT NULL,
  "monthly_value" DECIMAL(12,2),
  "end_date" DATE,
  "service_frequency" VARCHAR(30),
  "service_schedule" JSONB,
  "billing_cycle" VARCHAR(20),
  "payment_terms" VARCHAR(50),
  "auto_renew" BOOLEAN,
  "renewal_notice_days" INTEGER,
  "terms_and_conditions" TEXT,
  "special_instructions" TEXT,
  "area_changes" JSONB,
  "task_changes" JSONB,
  "proposed_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "applied_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "applied_at" TIMESTAMPTZ(6),
  "canceled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_amendments"
  ADD CONSTRAINT "contract_amendments_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "contract_amendments_proposed_by_user_id_fkey"
    FOREIGN KEY ("proposed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "contract_amendments_approved_by_user_id_fkey"
    FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "contract_amendments_applied_by_user_id_fkey"
    FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "contract_amendments_contract_id_idx" ON "contract_amendments"("contract_id");
CREATE INDEX "contract_amendments_status_idx" ON "contract_amendments"("status");
CREATE INDEX "contract_amendments_effective_date_idx" ON "contract_amendments"("effective_date");
CREATE INDEX "contract_amendments_proposed_by_user_id_idx" ON "contract_amendments"("proposed_by_user_id");
CREATE INDEX "contract_amendments_approved_by_user_id_idx" ON "contract_amendments"("approved_by_user_id");
CREATE INDEX "contract_amendments_applied_by_user_id_idx" ON "contract_amendments"("applied_by_user_id");
CREATE INDEX "contract_amendments_created_at_idx" ON "contract_amendments"("created_at");
