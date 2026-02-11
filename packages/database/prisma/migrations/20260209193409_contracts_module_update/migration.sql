-- CreateTable
CREATE TABLE "contract_activities" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_activities_contract_id_idx" ON "contract_activities"("contract_id");

-- CreateIndex
CREATE INDEX "contract_activities_action_idx" ON "contract_activities"("action");

-- CreateIndex
CREATE INDEX "contract_activities_created_at_idx" ON "contract_activities"("created_at");

-- AddForeignKey
ALTER TABLE "contract_activities" ADD CONSTRAINT "contract_activities_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_activities" ADD CONSTRAINT "contract_activities_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
