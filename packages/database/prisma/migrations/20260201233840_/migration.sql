-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "idx_refresh_tokens_expires_at" RENAME TO "refresh_tokens_expires_at_idx";

-- RenameIndex
ALTER INDEX "idx_refresh_tokens_token_jti" RENAME TO "refresh_tokens_token_jti_idx";

-- RenameIndex
ALTER INDEX "idx_refresh_tokens_user_id" RENAME TO "refresh_tokens_user_id_idx";
