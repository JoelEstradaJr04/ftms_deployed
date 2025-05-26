/*
  Warnings:

  - A unique constraint covering the columns `[category,assignment_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,receipt_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,other_source,other_category,total_amount,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,assignment_id,collection_date]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,other_source,total_amount,collection_date]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ExpenseRecord_category_assignment_id_other_source_other_cat_key";

-- DropIndex
DROP INDEX "RevenueRecord_category_assignment_id_other_source_total_amo_key";

-- CreateIndex
CREATE UNIQUE INDEX "unique_expense_assignment_where_not_null" ON "ExpenseRecord"("category", "assignment_id", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_expense_receipt_where_not_null" ON "ExpenseRecord"("category", "receipt_id", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_expense_other_where_not_null" ON "ExpenseRecord"("category", "other_source", "other_category", "total_amount", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_revenue_assignment_where_not_null" ON "RevenueRecord"("category", "assignment_id", "collection_date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_revenue_other_where_not_null" ON "RevenueRecord"("category", "other_source", "total_amount", "collection_date");
