-- Add missing notification preferences column expected by Prisma schema
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "notification_preferences" JSONB NOT NULL DEFAULT '{}';
