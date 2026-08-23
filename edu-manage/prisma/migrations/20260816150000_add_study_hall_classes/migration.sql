CREATE TYPE "StudyHallScheduleType" AS ENUM ('WEEKDAY_LATE', 'WEEKEND');
CREATE TYPE "StudyHallClassStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "StudyHallMembershipStatus" AS ENUM ('ACTIVE', 'LEFT');

CREATE TABLE "StudyHallClass" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "termId" TEXT NOT NULL,
  "division" TEXT NOT NULL DEFAULT 'JUNIOR',
  "scheduleType" "StudyHallScheduleType" NOT NULL,
  "weekdays" INTEGER[] NOT NULL,
  "timeWindowStart" TEXT,
  "timeWindowEnd" TEXT,
  "status" "StudyHallClassStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallClass_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyHallClass_weekdays_check" CHECK (cardinality("weekdays") > 0 AND "weekdays" <@ ARRAY[1,2,3,4,5,6,7])
);

CREATE TABLE "StudyHallClassTeacher" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "StudyHallClassTeacher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHallClassStudent" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "joinedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
  "leftAt" DATE,
  "status" "StudyHallMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "pickupContact" TEXT,
  "pickupPhone" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallClassStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHallSession" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "slot" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyHallSession_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
  CONSTRAINT "StudyHallSession_time_check" CHECK ("startTime" < "endTime")
);

CREATE TABLE "StudyHallClassRecord" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studyDate" DATE NOT NULL,
  "homeworkItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "teacherComment" TEXT,
  "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallClassRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHallHomeworkEntry" (
  "id" TEXT NOT NULL,
  "classRecordId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT,
  "attendanceKey" TEXT NOT NULL,
  "homeworkStatus" "HomeworkCompletionStatus" NOT NULL DEFAULT 'NOT_RECORDED',
  "homeworkItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "teacherComment" TEXT,
  "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "checkedIn" BOOLEAN NOT NULL DEFAULT false,
  "checkInAt" TIMESTAMP(3),
  "checkOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallHomeworkEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyHallHomeworkEntry_attendance_key_check" CHECK (
    ("sessionId" IS NULL AND "attendanceKey" = 'DAY') OR
    ("sessionId" IS NOT NULL AND "attendanceKey" = 'SESSION:' || "sessionId")
  )
);

CREATE TABLE "StudyHallMonthlyQuota" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "monthKey" TEXT NOT NULL,
  "entitledDays" INTEGER NOT NULL,
  "adjustment" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyHallMonthlyQuota_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyHallMonthlyQuota_month_check" CHECK ("monthKey" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "StudyHallMonthlyQuota_days_check" CHECK ("entitledDays" >= 0)
);

CREATE INDEX "StudyHallClass_termId_status_idx" ON "StudyHallClass"("termId", "status");
CREATE INDEX "StudyHallClass_division_scheduleType_status_idx" ON "StudyHallClass"("division", "scheduleType", "status");
CREATE INDEX "StudyHallClassTeacher_classId_active_idx" ON "StudyHallClassTeacher"("classId", "active");
CREATE INDEX "StudyHallClassTeacher_teacherId_active_idx" ON "StudyHallClassTeacher"("teacherId", "active");
CREATE UNIQUE INDEX "StudyHallClassTeacher_active_key" ON "StudyHallClassTeacher"("classId", "teacherId") WHERE "active" = true;
CREATE UNIQUE INDEX "StudyHallClassStudent_classId_studentId_key" ON "StudyHallClassStudent"("classId", "studentId");
CREATE INDEX "StudyHallClassStudent_studentId_status_idx" ON "StudyHallClassStudent"("studentId", "status");
CREATE UNIQUE INDEX "StudyHallSession_classId_weekday_slot_key" ON "StudyHallSession"("classId", "weekday", "slot");
CREATE INDEX "StudyHallSession_classId_active_idx" ON "StudyHallSession"("classId", "active");
CREATE UNIQUE INDEX "StudyHallClassRecord_classId_studyDate_key" ON "StudyHallClassRecord"("classId", "studyDate");
CREATE INDEX "StudyHallClassRecord_studyDate_updatedAt_idx" ON "StudyHallClassRecord"("studyDate", "updatedAt");
CREATE UNIQUE INDEX "StudyHallHomeworkEntry_classRecordId_studentId_attendanceKey_key" ON "StudyHallHomeworkEntry"("classRecordId", "studentId", "attendanceKey");
CREATE INDEX "StudyHallHomeworkEntry_studentId_checkedIn_updatedAt_idx" ON "StudyHallHomeworkEntry"("studentId", "checkedIn", "updatedAt");
CREATE INDEX "StudyHallHomeworkEntry_sessionId_checkedIn_idx" ON "StudyHallHomeworkEntry"("sessionId", "checkedIn");
CREATE UNIQUE INDEX "StudyHallMonthlyQuota_membershipId_monthKey_key" ON "StudyHallMonthlyQuota"("membershipId", "monthKey");
CREATE INDEX "StudyHallMonthlyQuota_monthKey_idx" ON "StudyHallMonthlyQuota"("monthKey");
CREATE UNIQUE INDEX "Notification_study_hall_homework_once_key"
  ON "Notification"("userId", "relatedType", "relatedId")
  WHERE "relatedType" = 'STUDY_HALL_HOMEWORK' AND "status" = 'ACTIVE';

ALTER TABLE "StudyHallClass" ADD CONSTRAINT "StudyHallClass_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassTeacher" ADD CONSTRAINT "StudyHallClassTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudyHallClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassTeacher" ADD CONSTRAINT "StudyHallClassTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassStudent" ADD CONSTRAINT "StudyHallClassStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudyHallClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassStudent" ADD CONSTRAINT "StudyHallClassStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallSession" ADD CONSTRAINT "StudyHallSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudyHallClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassRecord" ADD CONSTRAINT "StudyHallClassRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudyHallClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallClassRecord" ADD CONSTRAINT "StudyHallClassRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallHomeworkEntry" ADD CONSTRAINT "StudyHallHomeworkEntry_classRecordId_fkey" FOREIGN KEY ("classRecordId") REFERENCES "StudyHallClassRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHallHomeworkEntry" ADD CONSTRAINT "StudyHallHomeworkEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallHomeworkEntry" ADD CONSTRAINT "StudyHallHomeworkEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudyHallSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyHallMonthlyQuota" ADD CONSTRAINT "StudyHallMonthlyQuota_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudyHallClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 旧晚托按“运营期 + 负责教师”归并成班，完整保留每生每天的原记录。
INSERT INTO "StudyHallClass" ("id", "name", "termId", "division", "scheduleType", "weekdays", "status", "createdAt", "updatedAt")
SELECT
  'legacy-shc-' || md5(plan."termId" || ':' || COALESCE(plan."assignedTeacherId", 'unassigned')),
  CASE WHEN plan."assignedTeacherId" IS NULL THEN '待分配晚托作业班' ELSE COALESCE(teacher."name", '晚托') || '负责的晚托作业班' END,
  plan."termId",
  term."division",
  'WEEKDAY_LATE'::"StudyHallScheduleType",
  ARRAY[1,2,3,4,5],
  CASE WHEN bool_or(plan."status" = 'ACTIVE') THEN 'ACTIVE'::"StudyHallClassStatus" ELSE 'PAUSED'::"StudyHallClassStatus" END,
  min(plan."createdAt"),
  max(plan."updatedAt")
FROM "StudyHallPlan" plan
JOIN "AcademicTerm" term ON term."id" = plan."termId"
LEFT JOIN "User" teacher ON teacher."id" = plan."assignedTeacherId"
GROUP BY plan."termId", term."division", plan."assignedTeacherId", teacher."name";

INSERT INTO "StudyHallClassTeacher" ("id", "classId", "teacherId", "active", "assignedAt")
SELECT DISTINCT
  'legacy-shct-' || md5(plan."termId" || ':' || plan."assignedTeacherId"),
  'legacy-shc-' || md5(plan."termId" || ':' || plan."assignedTeacherId"),
  plan."assignedTeacherId",
  true,
  min(plan."createdAt") OVER (PARTITION BY plan."termId", plan."assignedTeacherId")
FROM "StudyHallPlan" plan
WHERE plan."assignedTeacherId" IS NOT NULL;

INSERT INTO "StudyHallClassStudent" ("id", "classId", "studentId", "joinedAt", "status", "pickupContact", "pickupPhone", "note", "createdAt", "updatedAt")
SELECT
  'legacy-shcs-' || md5(plan."id"),
  'legacy-shc-' || md5(plan."termId" || ':' || COALESCE(plan."assignedTeacherId", 'unassigned')),
  plan."studentId",
  plan."createdAt"::date,
  CASE WHEN plan."status" = 'ACTIVE' THEN 'ACTIVE'::"StudyHallMembershipStatus" ELSE 'LEFT'::"StudyHallMembershipStatus" END,
  plan."pickupContact",
  plan."pickupPhone",
  plan."note",
  plan."createdAt",
  plan."updatedAt"
FROM "StudyHallPlan" plan;

INSERT INTO "StudyHallClassRecord" ("id", "classId", "studyDate", "recordedById", "createdAt", "updatedAt")
SELECT DISTINCT ON (class_id, record."studyDate")
  'legacy-shcr-' || md5(class_id || ':' || record."studyDate"::text),
  class_id,
  record."studyDate",
  record."recordedById",
  record."createdAt",
  record."updatedAt"
FROM (
  SELECT legacy.*, 'legacy-shc-' || md5(plan."termId" || ':' || COALESCE(plan."assignedTeacherId", 'unassigned')) AS class_id
  FROM "StudyHallRecord" legacy
  JOIN "StudyHallPlan" plan ON plan."id" = legacy."planId"
) record
ORDER BY class_id, record."studyDate", record."updatedAt" DESC;

INSERT INTO "StudyHallHomeworkEntry" (
  "id", "classRecordId", "studentId", "attendanceKey", "homeworkStatus", "homeworkItems",
  "teacherComment", "imageUrls", "checkedIn", "checkInAt", "checkOutAt", "createdAt", "updatedAt"
)
SELECT
  'legacy-shhe-' || md5(record."id"),
  'legacy-shcr-' || md5(('legacy-shc-' || md5(plan."termId" || ':' || COALESCE(plan."assignedTeacherId", 'unassigned'))) || ':' || record."studyDate"::text),
  record."studentId",
  'DAY',
  record."homeworkStatus",
  CASE WHEN jsonb_typeof(record."homeworkItems") = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(record."homeworkItems"))
    ELSE ARRAY[]::TEXT[] END,
  record."teacherComment",
  record."imageUrls",
  record."checkInAt" IS NOT NULL,
  record."checkInAt",
  record."checkOutAt",
  record."createdAt",
  record."updatedAt"
FROM "StudyHallRecord" record
JOIN "StudyHallPlan" plan ON plan."id" = record."planId";
