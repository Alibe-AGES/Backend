/*
  Warnings:

  - Added the required column `date` to the `availability` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "availability" ADD COLUMN     "date" DATE NOT NULL;
