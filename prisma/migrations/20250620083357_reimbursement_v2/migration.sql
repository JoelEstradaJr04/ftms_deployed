/*
  Warnings:

  - You are about to drop the `EmployeeReimbursement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operationReimbursement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmployeeReimbursement" DROP CONSTRAINT "EmployeeReimbursement_expense_id_fkey";

-- DropTable
DROP TABLE "EmployeeReimbursement";

-- DropTable
DROP TABLE "operationReimbursement";

-- CreateTable
CREATE TABLE "Reimbursement" (
    "reimbursement_id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "job_title" TEXT,
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

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("reimbursement_id")
);

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "ExpenseRecord"("expense_id") ON DELETE RESTRICT ON UPDATE CASCADE;
