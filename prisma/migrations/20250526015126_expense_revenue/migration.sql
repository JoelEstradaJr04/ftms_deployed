/*
  Warnings:

  - A unique constraint covering the columns `[category,assignment_id,other_source,other_category,total_amount,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,assignment_id,other_source,total_amount,collection_date]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_assignment_id_other_source_other_cat_key" ON "ExpenseRecord"("category", "assignment_id", "other_source", "other_category", "total_amount", "expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_category_assignment_id_other_source_total_amo_key" ON "RevenueRecord"("category", "assignment_id", "other_source", "total_amount", "collection_date");
