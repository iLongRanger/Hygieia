ALTER TABLE "proposal_items"
ADD COLUMN "billing_frequency" VARCHAR(20) NOT NULL DEFAULT 'one_time';

CREATE INDEX "proposal_items_billing_frequency_idx" ON "proposal_items"("billing_frequency");
