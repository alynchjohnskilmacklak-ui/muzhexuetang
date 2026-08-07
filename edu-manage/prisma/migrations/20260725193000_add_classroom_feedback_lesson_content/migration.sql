-- Add the teacher-entered lesson content without changing historical feedback.
-- The application requires this field only for newly published feedback.
ALTER TABLE "ClassroomFeedback"
ADD COLUMN "lessonContent" TEXT;
