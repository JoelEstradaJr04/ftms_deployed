/*
  Warnings:

  - Added the required column `category` to the `ReceiptItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ExpenseCategory" ADD VALUE 'Multiple_Categories';

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "category" "ExpenseCategory" NOT NULL;
