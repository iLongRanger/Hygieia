-- Add per-property default residential add-ons for proposal pricing.
ALTER TABLE "residential_properties"
  ADD COLUMN "default_add_ons" JSONB NOT NULL DEFAULT '[]'::jsonb;
