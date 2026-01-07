-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" VARCHAR(255),
ALTER COLUMN "supabase_user_id" DROP NOT NULL;
