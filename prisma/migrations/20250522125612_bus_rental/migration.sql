/*
  Warnings:

  - The values [Human_resources] on the enum `Department` will be removed. If these variants are still used in the database, this will fail.
  - The values [Rental] on the enum `RevenueCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Department_new" AS ENUM ('Operations', 'Inventory', 'Human_Resources');
ALTER TABLE "ExpenseRecord" ALTER COLUMN "department_from" TYPE "Department_new" USING ("department_from"::text::"Department_new");
ALTER TYPE "Department" RENAME TO "Department_old";
ALTER TYPE "Department_new" RENAME TO "Department";
DROP TYPE "Department_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RevenueCategory_new" AS ENUM ('Boundary', 'Percentage', 'Bus_Rental', 'Other');
ALTER TABLE "RevenueRecord" ALTER COLUMN "category" TYPE "RevenueCategory_new" USING ("category"::text::"RevenueCategory_new");
ALTER TYPE "RevenueCategory" RENAME TO "RevenueCategory_old";
ALTER TYPE "RevenueCategory_new" RENAME TO "RevenueCategory";
DROP TYPE "RevenueCategory_old";
COMMIT;
