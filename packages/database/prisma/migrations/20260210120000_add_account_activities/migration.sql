-- CreateTable
CREATE TABLE "account_activities" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "entry_type" VARCHAR(30) NOT NULL,
    "note" TEXT NOT NULL,
    "performed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_activities_account_id_idx" ON "account_activities"("account_id");

-- CreateIndex
CREATE INDEX "account_activities_entry_type_idx" ON "account_activities"("entry_type");

-- CreateIndex
CREATE INDEX "account_activities_created_at_idx" ON "account_activities"("created_at");

-- AddForeignKey
ALTER TABLE "account_activities" ADD CONSTRAINT "account_activities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_activities" ADD CONSTRAINT "account_activities_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
