-- CreateTable
CREATE TABLE "PayrollRecord" (
    "payroll_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "suffix" TEXT,
    "employee_status" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "termination_date" TIMESTAMP(3),
    "job_title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "payroll_period" TEXT NOT NULL,
    "payroll_start_date" TIMESTAMP(3) NOT NULL,
    "payroll_end_date" TIMESTAMP(3) NOT NULL,
    "basic_rate" DECIMAL(20,4) NOT NULL,
    "days_worked" INTEGER NOT NULL DEFAULT 0,
    "basic_pay" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "overtime_regular" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "overtime_holiday" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "service_incentive_leave" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "holiday_pay" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "thirteenth_month_pay" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "revenue_benefit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "safety_benefit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "additional_benefits" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "sss_deduction" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "philhealth_deduction" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "pag_ibig_deduction" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "cash_advance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "damage_shortage" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "gross_total_earnings" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "date_released" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("payroll_id")
);

-- CreateIndex
CREATE INDEX "PayrollRecord_payroll_start_date_payroll_end_date_idx" ON "PayrollRecord"("payroll_start_date", "payroll_end_date");

-- CreateIndex
CREATE INDEX "PayrollRecord_employee_number_is_deleted_idx" ON "PayrollRecord"("employee_number", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_employee_number_payroll_start_date_payroll_en_key" ON "PayrollRecord"("employee_number", "payroll_start_date", "payroll_end_date");
