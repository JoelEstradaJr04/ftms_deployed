/*
  Warnings:

  - A unique constraint covering the columns `[category_id,assignment_id,bus_trip_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "bus_trip_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_id_assignment_id_bus_trip_id_expense_key" ON "ExpenseRecord"("category_id", "assignment_id", "bus_trip_id", "expense_date");
