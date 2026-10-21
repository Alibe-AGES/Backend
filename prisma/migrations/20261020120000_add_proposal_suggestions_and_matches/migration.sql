-- CreateEnum
CREATE TYPE "proposal_type_enum" AS ENUM ('suggestion', 'event');

-- AlterTable
ALTER TABLE "group_notification" ADD COLUMN     "location_id" UUID;

-- AlterTable
-- group_id starts nullable so existing proposals can be backfilled from their event.
ALTER TABLE "proposal" ADD COLUMN     "group_id" UUID,
ADD COLUMN     "location_id" UUID,
ADD COLUMN     "matched_at" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "type" "proposal_type_enum" NOT NULL DEFAULT 'event',
ALTER COLUMN "event_id" DROP NOT NULL;

-- Every existing proposal belongs to an event, so it inherits the event group.
UPDATE "proposal"
SET "group_id" = "event"."group_id"
FROM "event"
WHERE "proposal"."event_id" = "event"."id";

ALTER TABLE "proposal" ALTER COLUMN "group_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "proposal_group_id_idx" ON "proposal"("group_id");

-- AddForeignKey
ALTER TABLE "group_notification" ADD CONSTRAINT "group_notification_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
