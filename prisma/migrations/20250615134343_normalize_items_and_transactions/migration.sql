/*
  Warnings:

  - You are about to drop the column `category` on the `ReceiptItem` table. All the data in the column will be lost.
  - You are about to drop the column `item_name` on the `ReceiptItem` table. All the data in the column will be lost.
  - You are about to drop the column `other_category` on the `ReceiptItem` table. All the data in the column will be lost.
  - You are about to drop the column `other_unit` on the `ReceiptItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `ReceiptItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[receipt_id,item_id]` on the table `ReceiptItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_id` to the `ReceiptItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "category" "ExpenseCategory" NOT NULL;

-- AlterTable
ALTER TABLE "ReceiptItem" DROP COLUMN "category",
DROP COLUMN "item_name",
DROP COLUMN "other_category",
DROP COLUMN "other_unit",
DROP COLUMN "unit",
ADD COLUMN     "item_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ItemTransaction_item_id_transaction_date_idx" ON "ItemTransaction"("item_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptItem_receipt_id_item_id_key" ON "ReceiptItem"("receipt_id", "item_id");

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
