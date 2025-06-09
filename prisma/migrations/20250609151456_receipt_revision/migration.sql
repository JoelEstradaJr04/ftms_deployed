/*
  Warnings:

  - The `terms` column on the `Receipt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Terms" AS ENUM ('Net_15', 'Net_30', 'Net_60', 'Net_90', 'Cash');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "other_category" TEXT,
DROP COLUMN "terms",
ADD COLUMN     "terms" "Terms" NOT NULL DEFAULT 'Cash';
