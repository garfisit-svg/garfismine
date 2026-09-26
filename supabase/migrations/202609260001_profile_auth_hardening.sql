-- Profile/auth hardening for projects created with SUPABASE_SCHEMA.sql or the
-- legacy migration. Apply after the existing schema.
BEGIN;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS password,
  DROP COLUMN IF EXISTS "resetToken",
  DROP COLUMN IF EXISTS "resetTokenExpires";

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
  IF auth.uid() IS NULL OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

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

DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', policy_row.policyname);
  END LOOP;
END;
$$;

CREATE POLICY profile_read_self_or_admin
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid()::text OR public.is_current_user_admin());

CREATE POLICY profile_update_self_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()::text OR public.is_current_user_admin())
  WITH CHECK (id = auth.uid()::text OR public.is_current_user_admin());

REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

COMMIT;
