-- AlterTable
ALTER TABLE "PayrollRecord" ADD COLUMN     "calculation_notes" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "hr_data_snapshot" JSONB,
ADD COLUMN     "processed_benefits" JSONB,
ADD COLUMN     "processed_deductions" JSONB;

-- CreateTable
CREATE TABLE "PayrollFrequencyConfig" (
    "id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "payroll_period" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollFrequencyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConfiguration" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "default_work_days" INTEGER NOT NULL DEFAULT 22,
    "weekend_work_allowed" BOOLEAN NOT NULL DEFAULT false,
    "holiday_work_rate" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "overtime_rate" DECIMAL(5,2) NOT NULL DEFAULT 1.25,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollFrequencyConfig_employee_number_key" ON "PayrollFrequencyConfig"("employee_number");
