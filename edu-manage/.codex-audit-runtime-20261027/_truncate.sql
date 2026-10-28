DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations') LOOP
    EXECUTE format('TRUNCATE TABLE "%s" CASCADE', r.tablename);
  END LOOP;
END $$;
