CREATE TYPE "AreaTypeScope" AS ENUM ('residential', 'commercial', 'both');

ALTER TABLE "area_types"
ADD COLUMN "scope" "AreaTypeScope" NOT NULL DEFAULT 'both';

CREATE INDEX "area_types_scope_idx" ON "area_types"("scope");
