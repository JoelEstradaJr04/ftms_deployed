-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('Equipments', 'Fuel', 'Other');

-- CreateEnum
CREATE TYPE "RevenueCategory" AS ENUM ('Boundary', 'Percentage', 'Rental', 'Other');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('Operations', 'Inventory', 'Human_resources');

-- CreateTable
CREATE TABLE "ExpenseRecord" (
    "expense_id" TEXT NOT NULL,
    "request_id" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "department_from" "Department" NOT NULL,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "RevenueRecord" (
    "revenue_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "category" "RevenueCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("revenue_id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "log_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_affected" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("log_id")
);
