-- CreateTable
CREATE TABLE "OperationReimbursement" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationReimbursement_pkey" PRIMARY KEY ("id")
);
