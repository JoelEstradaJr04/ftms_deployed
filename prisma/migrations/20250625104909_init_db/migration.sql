/*
  Warnings:

  - You are about to drop the column `other_unit` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "other_unit";

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "is_inventory_processed" BOOLEAN NOT NULL DEFAULT false;
