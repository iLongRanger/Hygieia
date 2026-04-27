-- Append-only per-item feedback channel for inspections.

CREATE TABLE IF NOT EXISTS "inspection_item_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_item_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_item_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inspection_item_feedback_inspection_item_id_idx" ON "inspection_item_feedback"("inspection_item_id");
CREATE INDEX IF NOT EXISTS "inspection_item_feedback_author_user_id_idx" ON "inspection_item_feedback"("author_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_item_feedback_inspection_item_id_fkey'
  ) THEN
    ALTER TABLE "inspection_item_feedback"
      ADD CONSTRAINT "inspection_item_feedback_inspection_item_id_fkey"
      FOREIGN KEY ("inspection_item_id")
      REFERENCES "inspection_items"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspection_item_feedback_author_user_id_fkey'
  ) THEN
    ALTER TABLE "inspection_item_feedback"
      ADD CONSTRAINT "inspection_item_feedback_author_user_id_fkey"
      FOREIGN KEY ("author_user_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;
