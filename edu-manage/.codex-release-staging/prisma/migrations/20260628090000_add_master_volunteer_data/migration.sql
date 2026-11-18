ALTER TABLE "HighSchoolInfo"
  ADD COLUMN IF NOT EXISTS "xinleLine" INTEGER,
  ADD COLUMN IF NOT EXISTS "xinleStatus" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "isProvincialDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "xinleFenpeiQuota" INTEGER;

CREATE TABLE IF NOT EXISTS "YifenYidang" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "count" INTEGER NOT NULL,
  "cumulative" INTEGER NOT NULL,
  CONSTRAINT "YifenYidang_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YifenYidang_year_score_key" ON "YifenYidang"("year", "score");
CREATE INDEX IF NOT EXISTS "YifenYidang_year_cumulative_idx" ON "YifenYidang"("year", "cumulative");

CREATE TABLE IF NOT EXISTS "AllocationQuota" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "juniorSchool" TEXT NOT NULL,
  "seniorSchool" TEXT NOT NULL,
  "quota" INTEGER NOT NULL,
  CONSTRAINT "AllocationQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AllocationQuota_year_juniorSchool_seniorSchool_key" ON "AllocationQuota"("year", "juniorSchool", "seniorSchool");
CREATE INDEX IF NOT EXISTS "AllocationQuota_year_juniorSchool_idx" ON "AllocationQuota"("year", "juniorSchool");

CREATE TABLE IF NOT EXISTS "JuniorEnrollment" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "juniorSchool" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  CONSTRAINT "JuniorEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JuniorEnrollment_year_juniorSchool_key" ON "JuniorEnrollment"("year", "juniorSchool");
CREATE INDEX IF NOT EXISTS "JuniorEnrollment_year_idx" ON "JuniorEnrollment"("year");
