/*
  Warnings:

  - You are about to drop the column `is_deleted` on the `Receipt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "other_category" TEXT;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "is_deleted",
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false;
