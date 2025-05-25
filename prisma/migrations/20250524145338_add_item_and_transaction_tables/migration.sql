/*
  Warnings:

  - The values [Equipments] on the enum `ExpenseCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('Paid', 'Pending', 'Cancelled');

-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('Fuel', 'Vehicle_Parts', 'Tools', 'Equipment', 'Supplies', 'Other');
ALTER TABLE "ExpenseRecord" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
COMMIT;

-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "other_source" TEXT,
ALTER COLUMN "department_from" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Receipt" (
    "receipt_id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "vat_reg_tin" TEXT,
    "terms" TEXT,
    "date_paid" TIMESTAMP(3),
    "status" "ReceiptStatus" NOT NULL,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "vat_amount" DECIMAL(20,4),
    "total_amount_due" DECIMAL(20,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "receipt_item_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "total_price" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("receipt_item_id")
);

-- CreateTable
CREATE TABLE "Item" (
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "ItemTransaction" (
    "transaction_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "receipt_id" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_item_name_key" ON "Item"("item_name");

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;
