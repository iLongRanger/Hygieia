CREATE TABLE "global_settings" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'global',
  "company_name" VARCHAR(255) NOT NULL DEFAULT 'Hygieia Cleaning Services',
  "company_email" VARCHAR(255),
  "company_phone" VARCHAR(20),
  "company_website" VARCHAR(500),
  "company_address" TEXT,
  "logo_data_url" TEXT,
  "theme_primary_color" VARCHAR(7) NOT NULL DEFAULT '#1a1a2e',
  "theme_accent_color" VARCHAR(7) NOT NULL DEFAULT '#d4af37',
  "theme_background_color" VARCHAR(7) NOT NULL DEFAULT '#f5f5f5',
  "theme_text_color" VARCHAR(7) NOT NULL DEFAULT '#333333',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "global_settings" ("id")
VALUES ('global')
ON CONFLICT ("id") DO NOTHING;
