DO $$
BEGIN
  CREATE TYPE "MaterialType" AS ENUM (
    'TEXTBOOK',
    'HANDOUT',
    'EXERCISE',
    'EXAM',
    'ANSWER',
    'REFERENCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
