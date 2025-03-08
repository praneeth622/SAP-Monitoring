/*
  Warnings:

  - Made the column `password` on table `SystemsDummy` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userID` on table `SystemsDummy` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SystemsDummy" ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "userID" SET NOT NULL;
