/*
  Warnings:

  - Made the column `systemName` on table `SystemsDummy` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SystemsDummy" ALTER COLUMN "systemName" SET NOT NULL;
