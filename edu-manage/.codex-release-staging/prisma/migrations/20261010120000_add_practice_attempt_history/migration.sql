CREATE TABLE IF NOT EXISTS "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "wrongIds" TEXT[] NOT NULL,
    "answers" JSONB,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PracticeAttempt_studentId_finishedAt_idx"
    ON "PracticeAttempt"("studentId", "finishedAt" DESC);

CREATE INDEX IF NOT EXISTS "PracticeAttempt_studentId_setId_finishedAt_idx"
    ON "PracticeAttempt"("studentId", "setId", "finishedAt" DESC);

-- 旧表只保留每个题组的最新成绩，迁移时将其作为可回看的第一条历史记录。
DO $migration$
BEGIN
    IF to_regclass('public."PracticeResult"') IS NOT NULL THEN
        EXECUTE $sql$
            INSERT INTO "PracticeAttempt" (
                "id", "studentId", "setId", "score", "total", "wrongIds",
                "answers", "finishedAt", "createdAt"
            )
            SELECT
                'legacy_' || md5(result."id"),
                result."studentId",
                result."setId",
                result."score",
                result."total",
                result."wrongIds",
                result."answers",
                result."finishedAt",
                result."createdAt"
            FROM public."PracticeResult" AS result
            ON CONFLICT ("id") DO NOTHING
        $sql$;
    END IF;
END
$migration$;
