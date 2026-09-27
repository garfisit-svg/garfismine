-- Keep the admin console's Postgres change feed enabled on both fresh and
-- upgraded Supabase projects. RLS still applies to every subscriber.
BEGIN;

CREATE INDEX IF NOT EXISTS gaming_cafes_status_owner_idx
  ON public.gaming_cafes (status, owner_id);
CREATE INDEX IF NOT EXISTS gaming_cafes_owner_created_idx
  ON public.gaming_cafes (owner_id, created_at DESC);

DO $realtime$
DECLARE
  table_name text;
  realtime_tables text[] := ARRAY[
    'profiles', 'gaming_cafes', 'venue_resources', 'slots', 'bookings'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY realtime_tables LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END;
$realtime$;

COMMIT;
