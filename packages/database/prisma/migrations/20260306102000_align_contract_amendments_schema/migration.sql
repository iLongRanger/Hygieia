ALTER TABLE "contract_amendments"
    ADD COLUMN IF NOT EXISTS "amendment_number" INTEGER,
    ADD COLUMN IF NOT EXISTS "amendment_type" VARCHAR(30) NOT NULL DEFAULT 'scope_change',
    ADD COLUMN IF NOT EXISTS "summary" TEXT,
    ADD COLUMN IF NOT EXISTS "reason" TEXT,
    ADD COLUMN IF NOT EXISTS "pricing_plan_id" UUID,
    ADD COLUMN IF NOT EXISTS "old_monthly_value" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "new_monthly_value" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "monthly_delta" DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "old_service_frequency" VARCHAR(30),
    ADD COLUMN IF NOT EXISTS "new_service_frequency" VARCHAR(30),
    ADD COLUMN IF NOT EXISTS "old_service_schedule" JSONB,
    ADD COLUMN IF NOT EXISTS "new_service_schedule" JSONB,
    ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB,
    ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'description'
    ) THEN
        EXECUTE '
            UPDATE "contract_amendments"
            SET "summary" = COALESCE("summary", "description")
            WHERE "description" IS NOT NULL
        ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'monthly_value'
    ) THEN
        EXECUTE '
            UPDATE "contract_amendments"
            SET "new_monthly_value" = COALESCE("new_monthly_value", "monthly_value")
            WHERE "monthly_value" IS NOT NULL
        ';

        EXECUTE '
            UPDATE "contract_amendments"
            SET "old_monthly_value" = COALESCE("old_monthly_value", "monthly_value", 0)
            WHERE "old_monthly_value" IS NULL
        ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'service_frequency'
    ) THEN
        EXECUTE '
            UPDATE "contract_amendments"
            SET "new_service_frequency" = COALESCE("new_service_frequency", "service_frequency")
            WHERE "service_frequency" IS NOT NULL
        ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'service_schedule'
    ) THEN
        EXECUTE '
            UPDATE "contract_amendments"
            SET "new_service_schedule" = COALESCE("new_service_schedule", "service_schedule")
            WHERE "service_schedule" IS NOT NULL
        ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'proposed_by_user_id'
    ) THEN
        EXECUTE '
            UPDATE "contract_amendments"
            SET "created_by_user_id" = COALESCE("created_by_user_id", "proposed_by_user_id")
            WHERE "proposed_by_user_id" IS NOT NULL
        ';
    END IF;
END $$;

WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "contract_id"
            ORDER BY "created_at" ASC, "id" ASC
        ) AS rn
    FROM "contract_amendments"
)
UPDATE "contract_amendments" AS ca
SET "amendment_number" = ranked.rn
FROM ranked
WHERE ca."id" = ranked."id"
  AND ca."amendment_number" IS NULL;

UPDATE "contract_amendments"
SET "monthly_delta" = CASE
    WHEN "new_monthly_value" IS NULL OR "old_monthly_value" IS NULL THEN NULL
    ELSE "new_monthly_value" - "old_monthly_value"
END
WHERE "monthly_delta" IS NULL;

ALTER TABLE "contract_amendments"
    ALTER COLUMN "amendment_number" SET NOT NULL,
    ALTER COLUMN "old_monthly_value" SET NOT NULL,
    ALTER COLUMN "created_by_user_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "contract_amendments_contract_id_amendment_number_key"
    ON "contract_amendments"("contract_id", "amendment_number");

CREATE INDEX IF NOT EXISTS "contract_amendments_created_by_user_id_idx"
    ON "contract_amendments"("created_by_user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contract_amendments_created_by_user_id_fkey'
    ) THEN
        ALTER TABLE "contract_amendments"
            ADD CONSTRAINT "contract_amendments_created_by_user_id_fkey"
            FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "contract_amendment_scope_snapshots" (
    "id" UUID NOT NULL,
    "amendment_id" UUID NOT NULL,
    "snapshot_type" VARCHAR(20) NOT NULL,
    "scope_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendment_scope_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_amendment_scope_snapshots_amendment_id_idx"
    ON "contract_amendment_scope_snapshots"("amendment_id");

CREATE INDEX IF NOT EXISTS "contract_amendment_scope_snapshots_snapshot_type_idx"
    ON "contract_amendment_scope_snapshots"("snapshot_type");

CREATE INDEX IF NOT EXISTS "contract_amendment_scope_snapshots_created_at_idx"
    ON "contract_amendment_scope_snapshots"("created_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contract_amendment_scope_snapshots_amendment_id_fkey'
    ) THEN
        ALTER TABLE "contract_amendment_scope_snapshots"
            ADD CONSTRAINT "contract_amendment_scope_snapshots_amendment_id_fkey"
            FOREIGN KEY ("amendment_id") REFERENCES "contract_amendments"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "contract_amendment_activities" (
    "id" UUID NOT NULL,
    "amendment_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_amendment_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_amendment_activities_amendment_id_idx"
    ON "contract_amendment_activities"("amendment_id");

CREATE INDEX IF NOT EXISTS "contract_amendment_activities_action_idx"
    ON "contract_amendment_activities"("action");

CREATE INDEX IF NOT EXISTS "contract_amendment_activities_created_at_idx"
    ON "contract_amendment_activities"("created_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contract_amendment_activities_amendment_id_fkey'
    ) THEN
        ALTER TABLE "contract_amendment_activities"
            ADD CONSTRAINT "contract_amendment_activities_amendment_id_fkey"
            FOREIGN KEY ("amendment_id") REFERENCES "contract_amendments"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'contract_amendment_activities_performed_by_user_id_fkey'
    ) THEN
        ALTER TABLE "contract_amendment_activities"
            ADD CONSTRAINT "contract_amendment_activities_performed_by_user_id_fkey"
            FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
