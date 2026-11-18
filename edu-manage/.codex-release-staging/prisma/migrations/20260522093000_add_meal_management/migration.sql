-- CreateTable
CREATE TABLE "MealMenu" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL DEFAULT 'lunch',
    "mainDish" TEXT NOT NULL,
    "sideDish" TEXT,
    "allowDouble" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "MealMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealReport" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "riceDouble" INTEGER NOT NULL DEFAULT 0,
    "riceSingle" INTEGER NOT NULL DEFAULT 0,
    "noodleCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealMenu_weekStart_dayOfWeek_mealType_key" ON "MealMenu"("weekStart", "dayOfWeek", "mealType");

-- CreateIndex
CREATE INDEX "MealMenu_weekStart_idx" ON "MealMenu"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "MealReport_menuId_teacherId_reportDate_key" ON "MealReport"("menuId", "teacherId", "reportDate");

-- CreateIndex
CREATE INDEX "MealReport_reportDate_idx" ON "MealReport"("reportDate");

-- CreateIndex
CREATE INDEX "MealReport_teacherId_reportDate_idx" ON "MealReport"("teacherId", "reportDate");

-- AddForeignKey
ALTER TABLE "MealMenu" ADD CONSTRAINT "MealMenu_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealReport" ADD CONSTRAINT "MealReport_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "MealMenu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealReport" ADD CONSTRAINT "MealReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
