/*
  Warnings:

  - A unique constraint covering the columns `[expense_id,employee_id]` on the table `Reimbursement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Reimbursement_expense_id_employee_id_key" ON "Reimbursement"("expense_id", "employee_id");
