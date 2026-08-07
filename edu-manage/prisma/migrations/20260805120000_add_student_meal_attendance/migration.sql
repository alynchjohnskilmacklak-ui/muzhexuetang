CREATE TABLE "StudentMealAttendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mealDate" DATE NOT NULL,
    "division" TEXT NOT NULL DEFAULT 'JUNIOR',
    "recordedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMealAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentMealAttendance_studentId_mealDate_key"
ON "StudentMealAttendance"("studentId", "mealDate");

CREATE INDEX "StudentMealAttendance_division_mealDate_idx"
ON "StudentMealAttendance"("division", "mealDate");

CREATE INDEX "StudentMealAttendance_studentId_mealDate_idx"
ON "StudentMealAttendance"("studentId", "mealDate");

ALTER TABLE "StudentMealAttendance"
ADD CONSTRAINT "StudentMealAttendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentMealAttendance"
ADD CONSTRAINT "StudentMealAttendance_recordedBy_fkey"
FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
