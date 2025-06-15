-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'NONE');

-- AlterEnum
ALTER TYPE "ExportFormat" ADD VALUE 'XSL';

-- AlterTable
ALTER TABLE "ItemTransaction" ADD COLUMN     "transaction_type" "TransactionType" NOT NULL DEFAULT 'NONE';
