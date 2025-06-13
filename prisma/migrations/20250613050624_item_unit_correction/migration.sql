-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('piece', 'box', 'pack', 'liter', 'gallon', 'milliliter', 'kilogram', 'gram', 'meter', 'foot', 'roll', 'set', 'pair', 'Other');

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "other_category" TEXT,
ADD COLUMN     "other_unit" TEXT;
