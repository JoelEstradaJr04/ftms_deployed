/*
  Warnings:

  - You are about to drop the column `date` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `department_from` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `recorded_by` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `request_id` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `receipt_date` on the `Receipt` table. All the data in the column will be lost.

*/
-- First add the new columns with NULL constraint temporarily removed
ALTER TABLE "ExpenseRecord" 
ADD COLUMN "created_by" TEXT,
ADD COLUMN "expense_date" TIMESTAMP(3);

-- Copy data from old columns to new ones
UPDATE "ExpenseRecord"
SET "created_by" = COALESCE("recorded_by", 'system'),
    "expense_date" = COALESCE("date", NOW());

-- Now make the columns NOT NULL
ALTER TABLE "ExpenseRecord" 
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "expense_date" SET NOT NULL;

-- Drop old columns from ExpenseRecord
ALTER TABLE "ExpenseRecord" 
DROP COLUMN "date",
DROP COLUMN "department_from",
DROP COLUMN "recorded_by",
DROP COLUMN "request_id";

-- Handle Receipt table changes
ALTER TABLE "Receipt" 
ADD COLUMN "transaction_date" TIMESTAMP(3);

-- Copy data from receipt_date to transaction_date
UPDATE "Receipt"
SET "transaction_date" = COALESCE("receipt_date", NOW());

-- Make transaction_date NOT NULL and drop receipt_date
ALTER TABLE "Receipt" 
ALTER COLUMN "transaction_date" SET NOT NULL,
ALTER COLUMN "total_amount_due" SET NOT NULL;

ALTER TABLE "Receipt"
DROP COLUMN "receipt_date";
