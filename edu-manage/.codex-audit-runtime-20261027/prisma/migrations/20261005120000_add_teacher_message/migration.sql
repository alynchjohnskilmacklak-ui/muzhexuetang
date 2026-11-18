-- 教师提醒/表扬消息表
CREATE TABLE "TeacherMessage" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherMessage_teacherId_readAt_idx" ON "TeacherMessage"("teacherId", "readAt");
