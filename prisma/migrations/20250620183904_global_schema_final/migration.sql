-- AlterTable
ALTER TABLE "GlobalReimbursementStatus" ADD COLUMN     "applicable_modules" TEXT[];

-- DropEnum
DROP TYPE "Department";

-- DropEnum
DROP TYPE "ExpenseCategory";

-- DropEnum
DROP TYPE "ItemUnit";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ReceiptSource";

-- DropEnum
DROP TYPE "ReceiptStatus";

-- DropEnum
DROP TYPE "RecordStatus";

-- DropEnum
DROP TYPE "ReimbursementStatus";

-- DropEnum
DROP TYPE "RevenueCategory";

-- DropEnum
DROP TYPE "Terms";
