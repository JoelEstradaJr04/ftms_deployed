/*
  Warnings:

  - You are about to drop the column `is_inventory_processed` on the `Receipt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "is_inventory_processed";

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "is_inventory_processed" BOOLEAN NOT NULL DEFAULT false;
