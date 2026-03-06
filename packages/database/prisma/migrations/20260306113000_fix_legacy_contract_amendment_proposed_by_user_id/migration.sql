UPDATE "contract_amendments"
SET "proposed_by_user_id" = COALESCE("proposed_by_user_id", "created_by_user_id")
WHERE EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contract_amendments'
      AND column_name = 'proposed_by_user_id'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contract_amendments'
          AND column_name = 'proposed_by_user_id'
    ) THEN
        ALTER TABLE "contract_amendments"
            ALTER COLUMN "proposed_by_user_id" DROP NOT NULL;
    END IF;
END $$;
