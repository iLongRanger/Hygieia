-- Add missing notification delivery flag expected by Prisma schema
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "email_sent" BOOLEAN NOT NULL DEFAULT false;

-- Keep schema index parity
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
