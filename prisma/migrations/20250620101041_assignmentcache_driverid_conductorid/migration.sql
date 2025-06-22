/*
  Warnings:

  - You are about to drop the column `conductor_name` on the `AssignmentCache` table. All the data in the column will be lost.
  - You are about to drop the column `driver_name` on the `AssignmentCache` table. All the data in the column will be lost.
  - Added the required column `conductor_id` to the `AssignmentCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driver_id` to the `AssignmentCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AssignmentCache" DROP COLUMN "conductor_name",
DROP COLUMN "driver_name",
ADD COLUMN     "conductor_id" TEXT NOT NULL,
ADD COLUMN     "driver_id" TEXT NOT NULL;
