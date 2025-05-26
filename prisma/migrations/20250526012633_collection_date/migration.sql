/*
  Warnings:

  - You are about to drop the column `date` on the `RevenueRecord` table. All the data in the column will be lost.
  - Added the required column `collection_date` to the `RevenueRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "date",
ADD COLUMN     "collection_date" TIMESTAMP(3) NOT NULL;
