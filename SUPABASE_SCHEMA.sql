-- =========================================================================
--  GARF (Gaming Arena & Recreation Finder) - SUPABASE DATABASE SCHEMA
--  Copy & paste this single SQL script into your Supabase SQL Editor!
-- =========================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean-up block (Optional: drops tables if they already exist, starting from child tables)

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner', 'admin', 'owner_pending')),
  garf_coins INTEGER DEFAULT 0 NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  date_of_birth DATE,
  city TEXT,
  is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
  no_show_count INTEGER DEFAULT 0 NOT NULL,
  pay_at_venue_blocked BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. GAMING_CAFES Table
CREATE TABLE IF NOT EXISTS gaming_cafes (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gaming_cafe', 'turf', 'both')),
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  cover_image TEXT,
  gallery_images TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  amenities TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  games_available TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  price_per_hour NUMERIC(10,2) DEFAULT 0 NOT NULL,
  rating NUMERIC(3,2) DEFAULT 0.00 NOT NULL,
  total_reviews INTEGER DEFAULT 0 NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
  operating_hours_start TEXT DEFAULT '09:00' NOT NULL,
  operating_hours_end TEXT DEFAULT '23:00' NOT NULL,
  operating_days TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  commission_percent NUMERIC(5,2) DEFAULT 10.00 NOT NULL,
  rejection_reason TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL
);

-- 3. VENUE_RESOURCES Table
CREATE TABLE IF NOT EXISTS venue_resources (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pc', 'ps5', 'xbox', 'vr', 'turf')),
  specifications TEXT,
  price_per_hour NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. OFFERS Table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL,
  max_discount_amount NUMERIC(10,2),
  min_booking_hours NUMERIC(5,2) DEFAULT 1.00 NOT NULL,
  valid_days TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  valid_from_time TEXT,
  valid_to_time TEXT,
  valid_from_date DATE,
  valid_to_date DATE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BOOKINGS Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_ref TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  resource_id TEXT REFERENCES venue_resources(id) ON DELETE CASCADE NOT NULL,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_hours NUMERIC(5,2) NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  coins_used INTEGER DEFAULT 0 NOT NULL,
  coins_discount_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 5.00 NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'pay_at_venue', 'walk_in', 'token_advance')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'refunded', 'partial_refund')),
  booking_status TEXT NOT NULL CHECK (booking_status IN ('held', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  hold_expires_at TIMESTAMP WITH TIME ZONE,
  advance_paid_amount NUMERIC(10,2) DEFAULT 0,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  refund_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  garf_coins_earned INTEGER DEFAULT 0 NOT NULL,
  offer_id TEXT REFERENCES offers(id) ON DELETE SET NULL,
  walk_in_customer_name TEXT,
  walk_in_customer_phone TEXT,
  walk_in_actual_start_time TEXT,
  walk_in_actual_end_time TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SLOTS Table
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  resource_id TEXT REFERENCES venue_resources(id) ON DELETE CASCADE NOT NULL,
  slot_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'held', 'booked', 'blocked')),
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  held_until TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_resource_slot UNIQUE (resource_id, slot_date, start_time)
);

-- 7. REVIEWS Table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT NOT NULL,
  owner_reply TEXT,
  owner_replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. COIN_TRANSACTIONS Table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'reminder', 'coins', 'promotion', 'review', 'system', 'owner', 'admin')),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ADMIN_LOGS Table
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('venue', 'user', 'booking')),
  target_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
--  🎮 GARF SQUAD SOCIAL LAYER TABLES
-- =========================================================================

-- 11. SQUAD_PROFILES Table
CREATE TABLE IF NOT EXISTS squad_profiles (
  id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  gamer_tag TEXT,
  bio TEXT,
  favorite_games TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  favorite_sports TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  preferred_city TEXT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_squads_joined INTEGER DEFAULT 0 NOT NULL,
  is_profile_public BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. SQUADS Table
CREATE TABLE IF NOT EXISTS squads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('gaming', 'sports', 'mixed', 'casual')),
  squad_code TEXT UNIQUE NOT NULL,
  cover_image TEXT,
  city TEXT NOT NULL,
  game_or_sport TEXT,
  max_members INTEGER DEFAULT 20 NOT NULL,
  is_private BOOLEAN DEFAULT FALSE NOT NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. SQUAD_MEMBERS Table
CREATE TABLE IF NOT EXISTS squad_members (
  id TEXT PRIMARY KEY,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'requested', 'removed', 'left')),
  invited_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_squad_member UNIQUE (squad_id, user_id)
);

-- 14. POLLS Table
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  created_by TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE,
  city TEXT,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  allow_multiple_choice BOOLEAN DEFAULT FALSE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE NOT NULL,
  total_votes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. POLL_VOTES Table
CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  selected_options INTEGER[] NOT NULL, -- index array of chosen options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_poll_vote UNIQUE (poll_id, user_id)
);

-- 16. PLAYER_NEEDED_POSTS Table
CREATE TABLE IF NOT EXISTS player_needed_posts (
  id TEXT PRIMARY KEY,
  posted_by TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  city TEXT NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  game_or_sport TEXT NOT NULL,
  players_needed INTEGER DEFAULT 1 NOT NULL,
  players_joined INTEGER DEFAULT 0 NOT NULL,
  booking_date DATE,
  booking_time TEXT,
  venue_booked BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. PLAYER_NEEDED_RESPONSES Table
CREATE TABLE IF NOT EXISTS player_needed_responses (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES player_needed_posts(id) ON DELETE CASCADE NOT NULL,
  responder_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_player_response UNIQUE (post_id, responder_id)
);

-- 18. MESSAGES Table (supports global_city, squad, and direct chat messages!)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('global_city', 'squad', 'direct')),
  sender_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT,
  content TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'poll', 'squad_invite', 'booking_share', 'player_needed', 'gif')),
  poll_id TEXT REFERENCES polls(id) ON DELETE SET NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  player_needed_id TEXT REFERENCES player_needed_posts(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. DM_THREADS Table
CREATE TABLE IF NOT EXISTS dm_threads (
  id TEXT PRIMARY KEY,
  user1_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_preview TEXT NOT NULL,
  user1_unread_count INTEGER DEFAULT 0 NOT NULL,
  user2_unread_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_dm_users UNIQUE (user1_id, user2_id)
);

-- 20. NEARBY_CHECKINS Table
CREATE TABLE IF NOT EXISTS nearby_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  want_to_meet BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. SQUAD_INVITES Table
CREATE TABLE IF NOT EXISTS squad_invites (
  id TEXT PRIMARY KEY,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  invited_by TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. SQUAD_EVENTS Table
CREATE TABLE IF NOT EXISTS squad_events (
  id TEXT PRIMARY KEY,
  squad_id TEXT REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE SET NULL,
  game_or_sport TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10 NOT NULL,
  notes TEXT,
  participants JSONB DEFAULT '{}'::JSONB NOT NULL, -- Format: {"user_id": "going" | "maybe"}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
--  🏗️ GARF OPERATIONAL MANAGEMENT LAYER
-- =========================================================================

-- 23. GAMING_EQUIPMENTS Table
CREATE TABLE IF NOT EXISTS gaming_equipments (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('pc', 'ps5', 'ps4', 'xbox_series_x', 'xbox_one', 'vr_headset', 'racing_sim', 'arcade')),
  custom_name TEXT NOT NULL,
  total_quantity INTEGER DEFAULT 1 NOT NULL,
  available_quantity INTEGER DEFAULT 1 NOT NULL,
  specifications TEXT NOT NULL,
  price_per_hour NUMERIC(10,2) NOT NULL,
  per_head_or_per_station TEXT NOT NULL CHECK (per_head_or_per_station IN ('per_station', 'per_head')),
  min_booking_hours NUMERIC(5,2) DEFAULT 1.00 NOT NULL,
  games_available TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  accessories_included TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  photos TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. TURF_DETAILS Table
CREATE TABLE IF NOT EXISTS turf_details (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  turf_name TEXT NOT NULL,
  turf_type TEXT NOT NULL CHECK (turf_type IN ('football_5aside', 'football_7aside', 'football_11aside', 'cricket_box', 'cricket_full', 'badminton', 'basketball', 'volleyball', 'tennis', 'multi_sport')),
  sports_allowed TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  surface_type TEXT NOT NULL CHECK (surface_type IN ('natural_grass', 'synthetic_turf', 'concrete', 'wooden', 'clay_court')),
  dimensions TEXT,
  capacity_per_team INTEGER DEFAULT 5 NOT NULL,
  total_capacity INTEGER DEFAULT 10 NOT NULL,
  has_flood_lights BOOLEAN DEFAULT FALSE NOT NULL,
  has_changing_room BOOLEAN DEFAULT FALSE NOT NULL,
  has_equipment_rental BOOLEAN DEFAULT FALSE NOT NULL,
  equipment_rental_details TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL,
  weekend_rate NUMERIC(10,2),
  peak_hour_rate NUMERIC(10,2),
  peak_hours_start TEXT,
  peak_hours_end TEXT,
  advance_booking_discount NUMERIC(5,2),
  advance_booking_min_hours NUMERIC(5,2) DEFAULT 24.00 NOT NULL,
  per_head_rate NUMERIC(10,2),
  min_booking_hours NUMERIC(5,2) DEFAULT 1.00 NOT NULL,
  requires_full_payment BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  photos TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  equipment_rentals JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of objects: [{"name": "ball", "price": 100}]
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 25. EQUIPMENT_SESSIONS Table
CREATE TABLE IF NOT EXISTS equipment_sessions (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  equipment_id TEXT REFERENCES gaming_equipments(id) ON DELETE CASCADE NOT NULL,
  quantity_used INTEGER DEFAULT 1 NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('online_booking', 'walk_in')),
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  walk_in_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. WALK_IN_SESSIONS Table
CREATE TABLE IF NOT EXISTS walk_in_sessions (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES gaming_cafes(id) ON DELETE CASCADE NOT NULL,
  equipment_id TEXT REFERENCES gaming_equipments(id) ON DELETE SET NULL,
  turf_id TEXT REFERENCES turf_details(id) ON DELETE SET NULL,
  quantity_used INTEGER DEFAULT 1 NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  number_of_players INTEGER DEFAULT 1 NOT NULL,
  amount_per_hour NUMERIC(10,2),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash', 'upi')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_duration_hours NUMERIC(5,2) NOT NULL,
  expected_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC(10,2),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  notes TEXT,
  sport_being_played TEXT,
  equipment_rental_items TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 27. TURF_BOOKINGS Table
CREATE TABLE IF NOT EXISTS turf_bookings (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  turf_id TEXT REFERENCES turf_details(id) ON DELETE CASCADE NOT NULL,
  number_of_players INTEGER DEFAULT 10 NOT NULL,
  sport_being_played TEXT NOT NULL,
  equipment_rental_requested BOOLEAN DEFAULT FALSE NOT NULL,
  equipment_rental_items TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  pricing_type_used TEXT NOT NULL CHECK (pricing_type_used IN ('hourly', 'per_head', 'peak', 'weekend')),
  rate_applied NUMERIC(10,2) NOT NULL,
  advance_discount_applied BOOLEAN DEFAULT FALSE NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
--  ⚡ SUPABASE REAL-TIME CONFIGURATION
-- =========================================================================

-- Enable real-time replication for fast, live chat and booking tracking
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table slots;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table gaming_cafes;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table venue_resources;

-- =========================================================================
--  📈 PERFORMANCE OPTIMIZING INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_slots_search ON slots(resource_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_messages_squad ON messages(squad_id) WHERE type = 'squad';
CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages(sender_id, receiver_id) WHERE type = 'direct';
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- Profile credentials belong in Supabase Auth. Profile RLS is intentionally
-- strict; the additive migration in supabase/migrations applies the same policy
-- to existing projects.
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

ALTER TABLE venue_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to venue_resources" ON venue_resources;
CREATE POLICY "Public active resources are readable" ON venue_resources
  FOR SELECT TO anon, authenticated
  USING (is_active OR EXISTS (
    SELECT 1 FROM gaming_cafes c
    WHERE c.id = venue_id AND (c.owner_id = auth.uid()::text OR public.is_current_user_admin())
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

