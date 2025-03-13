/*
  Warnings:

  - You are about to drop the `template_graphs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `graphs` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "template_graphs" DROP CONSTRAINT "template_graphs_templateId_fkey";

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "graphs" JSONB NOT NULL;

-- DropTable
DROP TABLE "template_graphs";

-- CreateIndex
CREATE INDEX "templates_graphs_idx" ON "templates" USING GIN ("graphs");
