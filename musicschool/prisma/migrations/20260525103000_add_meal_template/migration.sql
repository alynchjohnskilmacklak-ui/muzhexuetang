CREATE TABLE "MealTemplate" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "title" TEXT,
  "breakfast" TEXT,
  "lunch" TEXT,
  "dinner" TEXT,
  "snack" TEXT,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealTemplate_weekday_isActive_idx" ON "MealTemplate"("weekday", "isActive");
