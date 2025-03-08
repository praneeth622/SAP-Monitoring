/*
  Warnings:

  - You are about to drop the column `password` on the `SystemsDummy` table. All the data in the column will be lost.
  - You are about to drop the column `userID` on the `SystemsDummy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemsDummy" DROP COLUMN "password",
DROP COLUMN "userID";
