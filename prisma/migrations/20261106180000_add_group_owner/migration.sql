ALTER TABLE "group" ADD COLUMN "owner_id" UUID;

-- Existing groups have no creator or membership timestamps. Choose once and persist.
UPDATE "group" AS g
SET "owner_id" = (
    SELECT ug."user_id" FROM "user_group" AS ug
    WHERE ug."group_id" = g."id"
    ORDER BY random()
    LIMIT 1
);

CREATE INDEX "group_owner_id_idx" ON "group"("owner_id");
ALTER TABLE "group" ADD CONSTRAINT "group_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
