-- CreateEnum
CREATE TYPE "group_notification_type" AS ENUM ('event_created', 'group_match');

-- CreateTable
CREATE TABLE "group_notification" (
    "id" UUID NOT NULL,
    "type" "group_notification_type" NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" UUID NOT NULL,
    "event_id" UUID,

    CONSTRAINT "group_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_notification_group_id_created_at_id_idx" ON "group_notification"("group_id", "created_at" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "group_notification" ADD CONSTRAINT "group_notification_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_notification" ADD CONSTRAINT "group_notification_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
