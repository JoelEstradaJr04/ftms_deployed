-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN     "cancelled_by" TEXT,
ADD COLUMN     "cancelled_date" TIMESTAMP(3);
