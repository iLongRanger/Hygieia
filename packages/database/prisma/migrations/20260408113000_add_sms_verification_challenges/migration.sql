CREATE TABLE "sms_verification_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_verification_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_verification_challenges_user_id_idx" ON "sms_verification_challenges"("user_id");
CREATE INDEX "sms_verification_challenges_purpose_idx" ON "sms_verification_challenges"("purpose");
CREATE INDEX "sms_verification_challenges_expires_at_idx" ON "sms_verification_challenges"("expires_at");

ALTER TABLE "sms_verification_challenges"
ADD CONSTRAINT "sms_verification_challenges_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
