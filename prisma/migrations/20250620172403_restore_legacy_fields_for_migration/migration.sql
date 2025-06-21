/*
  Warnings:

  - You are about to drop the column `category` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `other_category` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `other_source` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `other_category` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `other_category` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `RevenueRecord` table. All the data in the column will be lost.
  - You are about to drop the column `other_source` on the `RevenueRecord` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[category_id,assignment_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category_id,receipt_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category_id,source_id,total_amount,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category_id,assignment_id,collection_date]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category_id,source_id,total_amount,collection_date]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ExpenseRecord_category_assignment_id_expense_date_key";

-- DropIndex
DROP INDEX "ExpenseRecord_category_other_source_other_category_total_am_key";

-- DropIndex
DROP INDEX "ExpenseRecord_category_receipt_id_expense_date_key";

-- DropIndex
DROP INDEX "RevenueRecord_category_assignment_id_collection_date_key";

-- DropIndex
DROP INDEX "RevenueRecord_category_other_source_total_amount_collection_key";

-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "category",
DROP COLUMN "other_category",
DROP COLUMN "other_source",
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "legacy_category" TEXT,
ADD COLUMN     "legacy_other_category" TEXT,
ADD COLUMN     "legacy_other_source" TEXT,
ADD COLUMN     "legacy_source" TEXT,
ADD COLUMN     "source_id" TEXT;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "category",
DROP COLUMN "other_category",
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "legacy_category" TEXT,
ADD COLUMN     "legacy_other_category" TEXT;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "category",
DROP COLUMN "other_category",
DROP COLUMN "source",
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "legacy_category" TEXT,
ADD COLUMN     "legacy_other_category" TEXT,
ADD COLUMN     "legacy_other_source" TEXT,
ADD COLUMN     "legacy_source" TEXT,
ADD COLUMN     "source_id" TEXT;

-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "category",
DROP COLUMN "other_source",
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "legacy_category" TEXT,
ADD COLUMN     "legacy_other_category" TEXT,
ADD COLUMN     "legacy_other_source" TEXT,
ADD COLUMN     "legacy_source" TEXT,
ADD COLUMN     "source_id" TEXT;

-- CreateTable
CREATE TABLE "GlobalSource" (
    "source_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicable_modules" TEXT[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalSource_pkey" PRIMARY KEY ("source_id")
);

-- CreateTable
CREATE TABLE "GlobalCategory" (
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicable_modules" TEXT[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalCategory_pkey" PRIMARY KEY ("category_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSource_name_key" ON "GlobalSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCategory_name_key" ON "GlobalCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_id_assignment_id_expense_date_key" ON "ExpenseRecord"("category_id", "assignment_id", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_id_receipt_id_expense_date_key" ON "ExpenseRecord"("category_id", "receipt_id", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_id_source_id_total_amount_expense_da_key" ON "ExpenseRecord"("category_id", "source_id", "total_amount", "expense_date");

-- CreateIndex
CREATE INDEX "Item_item_name_is_deleted_idx" ON "Item"("item_name", "is_deleted");

-- CreateIndex
CREATE INDEX "Item_category_id_is_deleted_idx" ON "Item"("category_id", "is_deleted");

-- CreateIndex
CREATE INDEX "Item_is_deleted_category_id_item_name_idx" ON "Item"("is_deleted", "category_id", "item_name");

-- CreateIndex
CREATE INDEX "ItemTransaction_transaction_date_is_deleted_idx" ON "ItemTransaction"("transaction_date", "is_deleted");

-- CreateIndex
CREATE INDEX "ItemTransaction_is_deleted_transaction_date_idx" ON "ItemTransaction"("is_deleted", "transaction_date");

-- CreateIndex
CREATE INDEX "ItemTransaction_item_id_is_deleted_transaction_date_idx" ON "ItemTransaction"("item_id", "is_deleted", "transaction_date");

-- CreateIndex
CREATE INDEX "Receipt_transaction_date_is_deleted_idx" ON "Receipt"("transaction_date", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_category_id_assignment_id_collection_date_key" ON "RevenueRecord"("category_id", "assignment_id", "collection_date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_category_id_source_id_total_amount_collection_key" ON "RevenueRecord"("category_id", "source_id", "total_amount", "collection_date");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
