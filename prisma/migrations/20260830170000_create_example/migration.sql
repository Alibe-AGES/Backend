CREATE TABLE "examples" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examples_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "examples_image_key_key"
    ON "examples"("image_key");
