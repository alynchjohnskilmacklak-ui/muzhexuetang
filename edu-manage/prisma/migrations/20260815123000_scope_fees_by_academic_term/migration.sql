ALTER TABLE "Fee" ADD COLUMN "termId" TEXT;

CREATE INDEX "Fee_termId_paidAt_idx" ON "Fee"("termId", "paidAt");

ALTER TABLE "Fee"
ADD CONSTRAINT "Fee_termId_fkey"
FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Only backfill a historical fee when the student's membership and fee date
-- point to exactly one operational batch. Ambiguous rows deliberately remain
-- unscoped for administrator review instead of being assigned by guesswork.
WITH candidates AS (
  SELECT
    fees."id" AS fee_id,
    MIN(memberships."termId") AS term_id,
    COUNT(DISTINCT memberships."termId") AS term_count
  FROM "Fee" AS fees
  JOIN "StudentTermMembership" AS memberships
    ON memberships."studentId" = fees."studentId"
  JOIN "AcademicTerm" AS terms
    ON terms."id" = memberships."termId"
   AND terms."division" = fees."division"
  WHERE fees."termId" IS NULL
    AND COALESCE(fees."paidAt", fees."createdAt")::date
        BETWEEN terms."startDate" AND terms."endDate"
  GROUP BY fees."id"
)
UPDATE "Fee" AS fees
SET "termId" = candidates.term_id
FROM candidates
WHERE fees."id" = candidates.fee_id
  AND candidates.term_count = 1;
