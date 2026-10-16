-- Preserve a Better Auth image only when the application does not already have a profile picture.
UPDATE "user"
SET "profile_pic" = "image"
WHERE "image" IS NOT NULL
  AND "profile_pic" IS NULL;

-- Better Auth now maps its logical image field to the existing Prisma profilePic field.
ALTER TABLE "user" DROP COLUMN "image";
