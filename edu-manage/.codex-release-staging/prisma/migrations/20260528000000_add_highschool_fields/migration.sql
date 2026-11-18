-- AlterTable
ALTER TABLE "HighSchoolInfo" ADD COLUMN "allocationLine" INTEGER;
ALTER TABLE "HighSchoolInfo" ADD COLUMN "acceptsOtherCounty" BOOLEAN NOT NULL DEFAULT false;
