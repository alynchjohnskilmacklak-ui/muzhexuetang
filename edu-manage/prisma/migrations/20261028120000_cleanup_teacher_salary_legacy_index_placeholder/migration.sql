-- Remove the inert compatibility index created before the historical
-- unguarded DROP INDEX. On fresh databases that old migration already
-- removed it; databases where the old migration was applied earlier need
-- this cleanup after the newly introduced pre-migration runs.
DROP INDEX IF EXISTS "TeacherSalaryTransaction_lessonId_type_key";
