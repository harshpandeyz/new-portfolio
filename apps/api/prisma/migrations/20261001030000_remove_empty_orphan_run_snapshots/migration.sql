-- This table is not part of the Prisma schema or application and has no
-- migration history. Remove the empty local tooling artifact, but refuse to
-- discard any data if another environment has populated it.
DO $$
BEGIN
  IF to_regclass('public.run_snapshots') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.run_snapshots LIMIT 1) THEN
      RAISE EXCEPTION 'public.run_snapshots contains data; archive and review it before applying this migration';
    END IF;

    DROP TABLE public.run_snapshots;
  END IF;
END
$$;
