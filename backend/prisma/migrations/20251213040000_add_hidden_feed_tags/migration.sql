-- AlterTable
ALTER TABLE "users" ADD COLUMN "hiddenFeedTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
