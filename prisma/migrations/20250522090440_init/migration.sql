/*
  Warnings:

  - You are about to drop the column `source` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `RevenueRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "source";

-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "source";
