-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('Fuel', 'Vehicle_Parts', 'Tools', 'Equipment', 'Supplies', 'Other');

-- CreateEnum
CREATE TYPE "RevenueCategory" AS ENUM ('Boundary', 'Percentage', 'Bus_Rental', 'Other');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('Operations', 'Inventory', 'Human_Resources');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('Paid', 'Pending', 'Cancelled');

-- CreateTable
CREATE TABLE "Sequence" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "ExpenseRecord" (
    "expense_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "request_id" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "department_from" "Department",
    "total_amount" DECIMAL(20,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "other_source" TEXT,

    CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "RevenueRecord" (
    "revenue_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "category" "RevenueCategory" NOT NULL,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "other_source" TEXT,

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

-- CreateTable
CREATE TABLE "AssignmentCache" (
    "assignment_id" TEXT NOT NULL,
    "bus_bodynumber" TEXT NOT NULL,
    "bus_platenumber" TEXT NOT NULL,
    "bus_route" TEXT NOT NULL,
    "bus_type" TEXT NOT NULL,
    "driver_name" TEXT NOT NULL,
    "conductor_name" TEXT NOT NULL,
    "date_assigned" TIMESTAMP(3) NOT NULL,
    "trip_fuel_expense" DECIMAL(20,4) NOT NULL,
    "trip_revenue" DECIMAL(20,4) NOT NULL,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "assignment_type" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentCache_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "receipt_id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "receipt_date" TIMESTAMP(3) NOT NULL,
    "vat_reg_tin" TEXT,
    "terms" TEXT,
    "date_paid" TIMESTAMP(3),
    "status" "ReceiptStatus" NOT NULL,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "vat_amount" DECIMAL(20,4),
    "total_amount_due" DECIMAL(20,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "receipt_item_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "total_price" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("receipt_item_id")
);

-- CreateTable
CREATE TABLE "Item" (
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "ItemTransaction" (
    "transaction_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "receipt_id" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_receipt_id_key" ON "ExpenseRecord"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "Item_item_name_key" ON "Item"("item_name");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;
