-- AlterTable
ALTER TABLE "GlobalItemUnit" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalPaymentMethod" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalPaymentStatus" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalRecordStatus" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalTerms" ADD COLUMN     "applicable_modules" TEXT[];
