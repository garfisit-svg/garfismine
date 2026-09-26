BEGIN;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS password,
  DROP COLUMN IF EXISTS "resetToken",
  DROP COLUMN IF EXISTS "resetTokenExpires";

DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','gaming_cafes','venue_resources','slots','bookings',
        'offers','reviews','coin_transactions','notifications','admin_logs','squad_profiles',
        'squads','squad_members','polls','poll_votes','player_needed_posts',
        'player_needed_responses','messages','dm_threads','nearby_checkins',
        'squad_invites','squad_events','gaming_equipments','turf_details',
        'equipment_sessions','walk_in_sessions','turf_bookings')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()::text AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_current_user_admin() THEN RETURN NEW; END IF;
  IF auth.uid()::text <> OLD.id THEN
    RAISE EXCEPTION 'Profile updates are restricted to the account owner';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT (OLD.role = 'customer' AND NEW.role = 'owner_pending') THEN
    RAISE EXCEPTION 'Role changes require administrator approval';
  END IF;
  IF NEW.garf_coins IS DISTINCT FROM OLD.garf_coins
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.no_show_count IS DISTINCT FROM OLD.no_show_count
     OR NEW.pay_at_venue_blocked IS DISTINCT FROM OLD.pay_at_venue_blocked THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed by the account owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privilege_fields ON public.profiles;
CREATE TRIGGER guard_profile_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_fields();

CREATE OR REPLACE FUNCTION public.create_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE requested_role text;
BEGIN
  requested_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'owner_pending' THEN 'owner_pending'
    ELSE 'customer'
  END;
  INSERT INTO public.profiles (id, full_name, email, phone, city, role, referral_code)
  VALUES (
    NEW.id::text,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1), 'Player'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'city', ''),
    requested_role,
    'GARF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_profile_for_auth_user() FROM PUBLIC;
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_auth_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS profile_read_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS profile_update_self_or_admin ON public.profiles;
CREATE POLICY profile_read_self_or_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR public.is_current_user_admin());
CREATE POLICY profile_update_self_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()::text OR public.is_current_user_admin())
  WITH CHECK (id = auth.uid()::text OR public.is_current_user_admin());
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Public browsing tables stay readable; the remaining user-specific tables use
-- RLS and receive no client policies until their operations have server-side
-- authorization rules.
ALTER TABLE gaming_cafes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to gaming_cafes" ON gaming_cafes;
CREATE POLICY "Public approved cafes are readable" ON gaming_cafes
  FOR SELECT TO anon, authenticated
  USING ((is_active AND status = 'approved' AND NOT is_suspended)
    OR owner_id = auth.uid()::text OR public.is_current_user_admin());
CREATE POLICY "Owners can register cafes" ON gaming_cafes
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid()::text AND status = 'pending'
    AND NOT is_verified AND NOT is_featured AND NOT is_suspended);
CREATE POLICY "Owners can update their cafes" ON gaming_cafes
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()::text OR public.is_current_user_admin())
  WITH CHECK (owner_id = auth.uid()::text OR public.is_current_user_admin());
CREATE POLICY "Admins can delete cafes" ON gaming_cafes
  FOR DELETE TO authenticated USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.guard_cafe_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
BEGIN
  IF auth.uid() IS NULL OR public.is_current_user_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_id <> auth.uid()::text THEN RAISE EXCEPTION 'Cafe owner must match the signed-in user'; END IF;
    NEW.status := 'pending';
    NEW.is_verified := false;
    NEW.is_featured := false;
    NEW.is_suspended := false;
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.commission_percent := 10;
    RETURN NEW;
  END IF;
  IF OLD.owner_id <> auth.uid()::text THEN RAISE EXCEPTION 'Cafe updates are restricted to its owner'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.commission_percent IS DISTINCT FROM OLD.commission_percent THEN
    RAISE EXCEPTION 'Cafe moderation fields require administrator approval';
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS guard_cafe_moderation_fields ON gaming_cafes;
CREATE TRIGGER guard_cafe_moderation_fields
  BEFORE INSERT OR UPDATE ON gaming_cafes
  FOR EACH ROW EXECUTE FUNCTION public.guard_cafe_moderation_fields();

ALTER TABLE venue_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to venue_resources" ON venue_resources;
CREATE POLICY "Public active resources are readable" ON venue_resources
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM gaming_cafes c
    WHERE c.id = venue_id AND (
      (c.is_active AND c.status = 'approved' AND NOT c.is_suspended)
      OR c.owner_id = auth.uid()::text OR public.is_current_user_admin()
    )
  ));
CREATE POLICY "Venue owners manage resources" ON venue_resources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
    AND (c.owner_id = auth.uid()::text OR public.is_current_user_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
    AND (c.owner_id = auth.uid()::text OR public.is_current_user_admin())));

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to slots" ON slots;
CREATE POLICY "Public slot availability is readable" ON slots
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
    AND ((c.is_active AND c.status = 'approved' AND NOT c.is_suspended)
      OR c.owner_id = auth.uid()::text OR public.is_current_user_admin())));
CREATE POLICY "Venue owners manage slots" ON slots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
    AND (c.owner_id = auth.uid()::text OR public.is_current_user_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
    AND (c.owner_id = auth.uid()::text OR public.is_current_user_admin())));

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to bookings" ON bookings;
CREATE POLICY "Customers owners and admins read bookings" ON bookings
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM gaming_cafes c WHERE c.id = venue_id
      AND c.owner_id = auth.uid()::text)
    OR public.is_current_user_admin());
CREATE POLICY "Admins manage bookings" ON bookings
  FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- Private operational/social tables default to deny until each feature has scoped
-- server-side read/write policies.
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_needed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_needed_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE nearby_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaming_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turf_bookings ENABLE ROW LEVEL SECURITY;


COMMIT;
