/*
  Warnings:

  - You are about to drop the column `bus_bodynumber` on the `AssignmentCache` table. All the data in the column will be lost.
  - You are about to drop the column `bus_platenumber` on the `AssignmentCache` table. All the data in the column will be lost.
  - Added the required column `assignment_value` to the `AssignmentCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bus_plate_number` to the `AssignmentCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `AssignmentCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AssignmentCache" DROP COLUMN "bus_bodynumber",
DROP COLUMN "bus_platenumber",
ADD COLUMN     "assignment_value" DECIMAL(20,4) NOT NULL,
ADD COLUMN     "bus_plate_number" TEXT NOT NULL,
ADD COLUMN     "payment_method" TEXT NOT NULL;
