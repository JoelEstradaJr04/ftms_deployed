/*
  Warnings:

  - You are about to drop the column `transaction_type` on the `ItemTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ItemTransaction" DROP COLUMN "transaction_type";

-- DropEnum
DROP TYPE "TransactionType";
