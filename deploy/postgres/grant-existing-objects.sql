-- Run as the PostgreSQL superuser against hp_os after hp_migrator and hp_app
-- have been created with \\password. Safe to re-run; it changes object owners
-- and grants only the application DML permissions needed by Prisma runtime.
ALTER SCHEMA public OWNER TO hp_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE hp_os TO hp_migrator, hp_app;
GRANT USAGE ON SCHEMA public TO hp_app;

DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO hp_migrator', item.tablename);
  END LOOP;

  FOR item IN
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO hp_migrator', item.sequence_name);
  END LOOP;

  FOR item IN
    SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd')
  LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO hp_migrator', item.typname);
  END LOOP;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hp_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO hp_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hp_migrator IN SCHEMA public
  GRANT USAGE ON TYPES TO hp_app;
