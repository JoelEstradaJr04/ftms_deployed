-- RenameIndex
ALTER INDEX "unique_expense_assignment_where_not_null" RENAME TO "ExpenseRecord_category_assignment_id_expense_date_key";

-- RenameIndex
ALTER INDEX "unique_expense_other_where_not_null" RENAME TO "ExpenseRecord_category_other_source_other_category_total_am_key";

-- RenameIndex
ALTER INDEX "unique_expense_receipt_where_not_null" RENAME TO "ExpenseRecord_category_receipt_id_expense_date_key";

-- RenameIndex
ALTER INDEX "unique_revenue_assignment_where_not_null" RENAME TO "RevenueRecord_category_assignment_id_collection_date_key";

-- RenameIndex
ALTER INDEX "unique_revenue_other_where_not_null" RENAME TO "RevenueRecord_category_other_source_total_amount_collection_key";
