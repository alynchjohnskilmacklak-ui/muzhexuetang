-- 课堂互动：点名并入 Attendance（点名与考勤共用同一事实），并新增随机提问记录
ALTER TABLE "Attendance"
ADD COLUMN "rollCallStatus" TEXT,
ADD COLUMN "rollCallMarkedAt" TIMESTAMP(3);

CREATE TABLE "ClassroomPick" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'RANDOM',
    "questionLabel" TEXT,
    "result" TEXT,
    "comment" TEXT,
    "parentVisible" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomPick_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassroomPick_lessonId_studentId_round_key" ON "ClassroomPick"("lessonId", "studentId", "round");
CREATE INDEX "ClassroomPick_lessonId_createdAt_idx" ON "ClassroomPick"("lessonId", "createdAt");
CREATE INDEX "ClassroomPick_studentId_createdAt_idx" ON "ClassroomPick"("studentId", "createdAt");
CREATE INDEX "ClassroomPick_teacherId_createdAt_idx" ON "ClassroomPick"("teacherId", "createdAt");

ALTER TABLE "ClassroomPick" ADD CONSTRAINT "ClassroomPick_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "ClassLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 点名改为"本地点选 + 一次性提交"：提交时间落在课次上，提交后才写 Attendance 并锁定点名
ALTER TABLE "ClassLesson"
ADD COLUMN "rollCallSubmittedAt" TIMESTAMP(3);
