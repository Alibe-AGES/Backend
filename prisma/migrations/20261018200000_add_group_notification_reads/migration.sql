-- RenameEnumValues
ALTER TYPE "group_notification_type" RENAME VALUE 'event_created' TO 'createdEvent';
ALTER TYPE "group_notification_type" RENAME VALUE 'group_match' TO 'match';

-- CreateTable
CREATE TABLE "group_notification_read" (
    "notification_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_notification_read_pkey" PRIMARY KEY ("notification_id", "user_id")
);

-- CreateIndex
CREATE INDEX "group_notification_read_user_id_idx" ON "group_notification_read"("user_id");

-- AddForeignKey
ALTER TABLE "group_notification_read" ADD CONSTRAINT "group_notification_read_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "group_notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_notification_read" ADD CONSTRAINT "group_notification_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
