-- Match the database column to the Prisma @updatedAt field, which has no DB default.
ALTER TABLE "TeacherFeedbackDraft"
ALTER COLUMN "updatedAt" DROP DEFAULT;
