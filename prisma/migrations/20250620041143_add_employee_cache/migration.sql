-- CreateTable
CREATE TABLE "EmployeeCache" (
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCache_pkey" PRIMARY KEY ("employee_id")
);
