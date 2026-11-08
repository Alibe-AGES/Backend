-- AlterTable
ALTER TABLE "user" ADD COLUMN "expo_push_token" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "user_expo_push_token_key" ON "user"("expo_push_token");
