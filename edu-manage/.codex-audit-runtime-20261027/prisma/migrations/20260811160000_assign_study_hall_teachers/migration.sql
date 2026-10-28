ALTER TABLE "StudyHallPlan" ADD COLUMN "assignedTeacherId" TEXT;

CREATE INDEX "StudyHallPlan_assignedTeacherId_status_idx"
ON "StudyHallPlan"("assignedTeacherId", "status");

ALTER TABLE "StudyHallPlan"
ADD CONSTRAINT "StudyHallPlan_assignedTeacherId_fkey"
FOREIGN KEY ("assignedTeacherId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing plans keep working in the admin console. If a teacher has already
-- recorded a plan, use the latest teacher account as its initial assignee.
UPDATE "StudyHallPlan" AS plan
SET "assignedTeacherId" = latest."recordedById"
FROM (
  SELECT DISTINCT ON (record."planId")
    record."planId",
    record."recordedById"
  FROM "StudyHallRecord" AS record
  INNER JOIN "User" AS recorder ON recorder."id" = record."recordedById"
  WHERE recorder."role" = 'teacher'
  ORDER BY record."planId", record."updatedAt" DESC
) AS latest
WHERE plan."id" = latest."planId";
