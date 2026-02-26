-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_id" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "password_set_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_set_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "password_set_tokens_token_key" ON "password_set_tokens"("token");

-- AddForeignKey (users -> teams)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_team_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (password_set_tokens -> users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'password_set_tokens_user_id_fkey' AND table_name = 'password_set_tokens'
  ) THEN
    ALTER TABLE "password_set_tokens" ADD CONSTRAINT "password_set_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
