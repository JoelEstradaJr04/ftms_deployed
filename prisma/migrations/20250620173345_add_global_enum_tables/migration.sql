/*
  Warnings:

  - You are about to drop the column `legacy_category` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_category` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_source` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_source` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_category` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_category` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_category` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_category` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_source` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_source` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `record_status` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `terms` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Reimbursement` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_category` on the `RevenueRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_category` on the `RevenueRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_other_source` on the `RevenueRecord` table. All the data in the column will be lost.
  - You are about to drop the column `legacy_source` on the `RevenueRecord` table. All the data in the column will be lost.
  - Added the required column `payment_method_id` to the `ExpenseRecord` table without a default value. This is not possible if the table is not empty.
  - Made the column `category_id` on table `ExpenseRecord` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `unit_id` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Made the column `category_id` on table `Item` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `payment_status_id` to the `Receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `record_status_id` to the `Receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `terms_id` to the `Receipt` table without a default value. This is not possible if the table is not empty.
  - Made the column `category_id` on table `Receipt` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `status_id` to the `Reimbursement` table without a default value. This is not possible if the table is not empty.
  - Made the column `category_id` on table `RevenueRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ExpenseRecord" DROP CONSTRAINT "ExpenseRecord_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_category_id_fkey";

-- DropForeignKey
ALTER TABLE "RevenueRecord" DROP CONSTRAINT "RevenueRecord_category_id_fkey";

-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "legacy_category",
DROP COLUMN "legacy_other_category",
DROP COLUMN "legacy_other_source",
DROP COLUMN "legacy_source",
DROP COLUMN "payment_method",
ADD COLUMN     "payment_method_id" TEXT NOT NULL,
ALTER COLUMN "category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "legacy_category",
DROP COLUMN "legacy_other_category",
DROP COLUMN "unit",
ADD COLUMN     "unit_id" TEXT NOT NULL,
ALTER COLUMN "category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "legacy_category",
DROP COLUMN "legacy_other_category",
DROP COLUMN "legacy_other_source",
DROP COLUMN "legacy_source",
DROP COLUMN "payment_status",
DROP COLUMN "record_status",
DROP COLUMN "terms",
ADD COLUMN     "payment_status_id" TEXT NOT NULL,
ADD COLUMN     "record_status_id" TEXT NOT NULL,
ADD COLUMN     "terms_id" TEXT NOT NULL,
ALTER COLUMN "category_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Reimbursement" DROP COLUMN "status",
ADD COLUMN     "status_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "legacy_category",
DROP COLUMN "legacy_other_category",
DROP COLUMN "legacy_other_source",
DROP COLUMN "legacy_source",
ALTER COLUMN "category_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "GlobalPaymentStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalPaymentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalRecordStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalRecordStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalTerms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalItemUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalPaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalReimbursementStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalReimbursementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPaymentStatus_name_key" ON "GlobalPaymentStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalRecordStatus_name_key" ON "GlobalRecordStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalTerms_name_key" ON "GlobalTerms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalItemUnit_name_key" ON "GlobalItemUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPaymentMethod_name_key" ON "GlobalPaymentMethod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalReimbursementStatus_name_key" ON "GlobalReimbursementStatus"("name");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "GlobalTerms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_record_status_id_fkey" FOREIGN KEY ("record_status_id") REFERENCES "GlobalRecordStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "GlobalItemUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "GlobalReimbursementStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
