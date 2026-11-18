ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

DO $admin_phone_backfill$
DECLARE
  ambiguous_admins INTEGER;
BEGIN
  WITH expected(name, phone) AS (
    VALUES
      ('任文涛', '15930114500'),
      ('马韶锟', '18031264903'),
      ('胡思同', '15230108197'),
      ('张拓', '17733883004')
  )
  SELECT COUNT(*) INTO ambiguous_admins
  FROM expected e
  WHERE (
    SELECT COUNT(*)
    FROM "User" u
    WHERE u."role" = 'admin'
      AND btrim(regexp_replace(btrim(u."name"), '[（(].*$', '')) = e.name
  ) > 1;

  IF ambiguous_admins > 0 THEN
    RAISE EXCEPTION 'Phone login mapping stopped: an administrator name matches multiple accounts in this database';
  END IF;

  IF EXISTS (
    WITH expected(name, phone) AS (
      VALUES
        ('任文涛', '15930114500'),
        ('马韶锟', '18031264903'),
        ('胡思同', '15230108197'),
        ('张拓', '17733883004')
    )
    SELECT 1
    FROM "User" u
    JOIN expected e ON u."phone" = e.phone
    WHERE NOT (
      u."role" = 'admin'
      AND btrim(regexp_replace(btrim(u."name"), '[（(].*$', '')) = e.name
    )
  ) THEN
    RAISE EXCEPTION 'Phone login mapping stopped: at least one phone is already assigned to another account';
  END IF;

  IF EXISTS (
    WITH expected(name, phone) AS (
      VALUES
        ('任文涛', '15930114500'),
        ('马韶锟', '18031264903'),
        ('胡思同', '15230108197'),
        ('张拓', '17733883004')
    )
    SELECT 1
    FROM "User" u
    JOIN expected e
      ON u."role" = 'admin'
     AND btrim(regexp_replace(btrim(u."name"), '[（(].*$', '')) = e.name
    WHERE u."phone" IS NOT NULL AND u."phone" <> e.phone
  ) THEN
    RAISE EXCEPTION 'Phone login mapping stopped: an administrator already has a different phone number';
  END IF;

  WITH expected(name, phone) AS (
    VALUES
      ('任文涛', '15930114500'),
      ('马韶锟', '18031264903'),
      ('胡思同', '15230108197'),
      ('张拓', '17733883004')
  )
  UPDATE "User" u
  SET "phone" = e.phone
  FROM expected e
  WHERE u."role" = 'admin'
    AND btrim(regexp_replace(btrim(u."name"), '[（(].*$', '')) = e.name;
END
$admin_phone_backfill$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
