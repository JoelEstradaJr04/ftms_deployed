/*
  Warnings:

  - The `details` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `is_expense_recorded` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Receipt` table. All the data in the column will be lost.
  - Added the required column `category` to the `Receipt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('Manual_Entry', 'OCR_Camera', 'OCR_File');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'PDF');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paid', 'Pending', 'Cancelled', 'Dued');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('Active', 'Inactive');

-- AlterEnum
ALTER TYPE "ReceiptStatus" ADD VALUE 'Dued';

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "details",
ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "is_expense_recorded",
DROP COLUMN "status",
ADD COLUMN     "category" "ExpenseCategory" NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "deletion_reason" TEXT,
ADD COLUMN     "ocr_confidence" DOUBLE PRECISION,
ADD COLUMN     "ocr_file_path" TEXT,
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "record_status" "RecordStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "source" "ReceiptSource" NOT NULL DEFAULT 'Manual_Entry',
ADD COLUMN     "storage_size_bytes" BIGINT,
ADD COLUMN     "updated_by" TEXT,
ALTER COLUMN "terms" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReceiptItem" ADD COLUMN     "ocr_confidence" DOUBLE PRECISION,
ADD COLUMN     "updated_by" TEXT;

-- CreateTable
CREATE TABLE "ReceiptExport" (
    "export_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "exported_by" TEXT NOT NULL,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filters_used" JSONB,
    "file_path" TEXT,

    CONSTRAINT "ReceiptExport_pkey" PRIMARY KEY ("export_id")
);

-- CreateTable
CREATE TABLE "ReceiptStorageConfig" (
    "config_id" TEXT NOT NULL,
    "auto_archive_months" INTEGER NOT NULL DEFAULT 6,
    "last_cleanup" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptStorageConfig_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "ReceiptOCRField" (
    "field_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "extracted_value" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "original_image_coords" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ReceiptOCRField_pkey" PRIMARY KEY ("field_id")
);

-- CreateTable
CREATE TABLE "ReceiptKeyword" (
    "keyword_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptKeyword_pkey" PRIMARY KEY ("keyword_id")
);

-- CreateTable
CREATE TABLE "ReceiptStorageMetrics" (
    "metric_id" TEXT NOT NULL,
    "total_receipts" INTEGER NOT NULL DEFAULT 0,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ReceiptStorageMetrics_pkey" PRIMARY KEY ("metric_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptOCRField_receipt_id_field_name_key" ON "ReceiptOCRField"("receipt_id", "field_name");

-- CreateIndex
CREATE INDEX "ReceiptKeyword_keyword_idx" ON "ReceiptKeyword"("keyword");

-- AddForeignKey
ALTER TABLE "ReceiptExport" ADD CONSTRAINT "ReceiptExport_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptOCRField" ADD CONSTRAINT "ReceiptOCRField_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptKeyword" ADD CONSTRAINT "ReceiptKeyword_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;
