-- AlterTable
ALTER TABLE "SystemsDummy" ADD COLUMN     "password" TEXT,
ADD COLUMN     "userID" TEXT,
ALTER COLUMN "systemName" DROP NOT NULL;
