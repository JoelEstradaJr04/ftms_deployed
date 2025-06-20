-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "employee_name" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "EmployeeReimbursement" (
    "reimbursement_id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'PENDING',
    "requested_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_date" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "paid_by" TEXT,
    "paid_date" TIMESTAMP(3),
    "payment_reference" TEXT,
    "payment_method" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmployeeReimbursement_pkey" PRIMARY KEY ("reimbursement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeReimbursement_expense_id_key" ON "EmployeeReimbursement"("expense_id");

-- AddForeignKey
ALTER TABLE "EmployeeReimbursement" ADD CONSTRAINT "EmployeeReimbursement_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "ExpenseRecord"("expense_id") ON DELETE RESTRICT ON UPDATE CASCADE;
