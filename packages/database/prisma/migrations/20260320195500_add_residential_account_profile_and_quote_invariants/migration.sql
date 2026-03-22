ALTER TABLE "accounts"
ADD COLUMN "service_address" JSONB,
ADD COLUMN "residential_profile" JSONB;

DO $$
DECLARE
  quote_record RECORD;
  new_account_id UUID;
BEGIN
  FOR quote_record IN
    SELECT id, customer_name, customer_email, customer_phone, home_address, home_profile, created_by_user_id
    FROM "residential_quotes"
    WHERE account_id IS NULL
  LOOP
    INSERT INTO "accounts" (
      "id",
      "name",
      "type",
      "billing_email",
      "billing_phone",
      "billing_address",
      "service_address",
      "residential_profile",
      "created_by_user_id",
      "created_at",
      "updated_at"
    ) VALUES (
      gen_random_uuid(),
      CONCAT(quote_record.customer_name, ' Residence'),
      'residential',
      quote_record.customer_email,
      quote_record.customer_phone,
      quote_record.home_address,
      quote_record.home_address,
      quote_record.home_profile,
      quote_record.created_by_user_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_account_id;

    UPDATE "residential_quotes"
    SET "account_id" = new_account_id
    WHERE "id" = quote_record.id;
  END LOOP;
END $$;

UPDATE "accounts"
SET "service_address" = COALESCE("service_address", "billing_address")
WHERE "type" = 'residential';

ALTER TABLE "residential_quotes"
ALTER COLUMN "account_id" SET NOT NULL;
