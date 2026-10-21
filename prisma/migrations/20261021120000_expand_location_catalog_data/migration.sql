-- AlterTable
ALTER TABLE "location"
ADD COLUMN "name" TEXT,
ADD COLUMN "opening_hours" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "rating" DOUBLE PRECISION,
ADD COLUMN "phone_number" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "price_start" DECIMAL(65,30),
ADD COLUMN "price_end" DECIMAL(65,30),
ADD COLUMN "price_currency" TEXT,
ADD COLUMN "image" TEXT;

-- A Google Place ID identifies a single catalog location. PostgreSQL still allows
-- multiple NULL values, which are used by manually-created locations.
CREATE UNIQUE INDEX "location_external_id_key" ON "location"("external_id");
