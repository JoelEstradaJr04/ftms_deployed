/*
  Warnings:

  - You are about to drop the column `employee_id` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `employee_name` on the `ExpenseRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "employee_id",
DROP COLUMN "employee_name";
