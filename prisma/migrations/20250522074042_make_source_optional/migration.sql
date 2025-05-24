-- AlterTable
ALTER TABLE "ExpenseRecord" ALTER COLUMN "source" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RevenueRecord" ALTER COLUMN "source" DROP NOT NULL;
