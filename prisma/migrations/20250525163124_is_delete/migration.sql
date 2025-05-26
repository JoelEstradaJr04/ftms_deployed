/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `RevenueRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "isDeleted",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "isDeleted",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "isDeleted",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
