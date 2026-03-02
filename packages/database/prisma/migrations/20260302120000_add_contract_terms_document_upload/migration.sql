ALTER TABLE "contracts"
ADD COLUMN "terms_document_name" VARCHAR(255),
ADD COLUMN "terms_document_mime_type" VARCHAR(100),
ADD COLUMN "terms_document_data_url" TEXT;
