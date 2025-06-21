/*
  Warnings:

  - You are about to drop the column `record_status_id` on the `Receipt` table. All the data in the column will be lost.
  - You are about to drop the `GlobalRecordStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_record_status_id_fkey";

-- AlterTable
ALTER TABLE "Receipt" DROP COLUMN "record_status_id";

-- DropTable
DROP TABLE "GlobalRecordStatus";
