/*
  Warnings:

  - A unique constraint covering the columns `[receipt_id]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_receipt_id_key" ON "ExpenseRecord"("receipt_id");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;
