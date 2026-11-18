CREATE TYPE "PostType" AS ENUM ('DAILY', 'HIGHLIGHT', 'WEEKLY_SUMMARY', 'ACHIEVEMENT');
CREATE TYPE "MoodLevel" AS ENUM ('GREAT', 'GOOD', 'OKAY', 'NEEDS_ATTENTION');
CREATE TYPE "Visibility" AS ENUM ('PARENT_ONLY', 'CLASS_PUBLIC');

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "link" TEXT;

CREATE TABLE "PerformancePost" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classLessonId" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'DAILY',
    "mood" "MoodLevel" NOT NULL DEFAULT 'GOOD',
    "content" TEXT NOT NULL,
    "images" TEXT[] NOT NULL,
    "tags" TEXT[] NOT NULL,
    "ratings" JSONB,
    "visibility" "Visibility" NOT NULL DEFAULT 'PARENT_ONLY',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notifySent" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformancePost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostBadge" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AchievementBadge" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "description" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementBadge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PerformancePost_studentId_createdAt_idx" ON "PerformancePost"("studentId", "createdAt");
CREATE INDEX "PerformancePost_teacherId_createdAt_idx" ON "PerformancePost"("teacherId", "createdAt");
CREATE INDEX "PerformancePost_deletedAt_idx" ON "PerformancePost"("deletedAt");
CREATE UNIQUE INDEX "PostReaction_postId_userId_type_key" ON "PostReaction"("postId", "userId", "type");
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");
CREATE INDEX "PostComment_isRead_createdAt_idx" ON "PostComment"("isRead", "createdAt");
CREATE INDEX "PostBadge_postId_idx" ON "PostBadge"("postId");
CREATE INDEX "AchievementBadge_studentId_earnedAt_idx" ON "AchievementBadge"("studentId", "earnedAt");

ALTER TABLE "PerformancePost" ADD CONSTRAINT "PerformancePost_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformancePost" ADD CONSTRAINT "PerformancePost_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformancePost" ADD CONSTRAINT "PerformancePost_classLessonId_fkey" FOREIGN KEY ("classLessonId") REFERENCES "ClassLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PerformancePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PerformancePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostBadge" ADD CONSTRAINT "PostBadge_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PerformancePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
