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
    "is_recorded" BOOLEAN NOT NULL DEFAULT false,
    "assignment_type" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentCache_pkey" PRIMARY KEY ("assignment_id")
);
