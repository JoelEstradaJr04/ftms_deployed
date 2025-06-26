/*
  Warnings:

  - You are about to drop the `OperationReimbursement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "OperationReimbursement";

-- CreateTable
CREATE TABLE "operationReimbursement" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operationReimbursement_pkey" PRIMARY KEY ("id")
);
