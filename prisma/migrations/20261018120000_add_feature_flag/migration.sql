-- CreateTable
CREATE TABLE "feature_flag" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("key")
);

-- Starts disabled so local environments do not call the Google Places budget fields.
INSERT INTO "feature_flag" ("key", "enabled", "description")
VALUES ('google_places_budget', false, 'Fetch the budget (price range) of places from Google Places; when disabled, mocked random values are used.')
ON CONFLICT ("key") DO NOTHING;
