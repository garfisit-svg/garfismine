-- =========================================================================
--  GARF (Gaming Arena & Recreation Finder) - SUPABASE DATABASE SCHEMA
--  Copy & paste this single SQL script into your Supabase SQL Editor!
-- =========================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean-up block (Optional: drops tables if they already exist, starting from child tables)
DROP TABLE IF EXISTS turf_bookings CASCADE;
DROP TABLE IF EXISTS walk_in_sessions CASCADE;
DROP TABLE IF EXISTS equipment_sessions CASCADE;
DROP TABLE IF EXISTS turf_details CASCADE;
DROP TABLE IF EXISTS gaming_equipments CASCADE;
DROP TABLE IF EXISTS squad_events CASCADE;
DROP TABLE IF EXISTS squad_invites CASCADE;
DROP TABLE IF EXISTS nearby_checkins CASCADE;
DROP TABLE IF EXISTS dm_threads CASCADE;
DROP TABLE IF EXISTS player_needed_responses CASCADE;
DROP TABLE IF EXISTS player_needed_posts CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS squad_members CASCADE;
DROP TABLE IF EXISTS squads CASCADE;
DROP TABLE IF EXISTS squad_profiles CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS coin_transactions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS venue_resources CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. PROFILES Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  password TEXT,
  "resetToken" TEXT,
  "resetTokenExpires" TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. VENUES Table
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. VENUE_RESOURCES Table
CREATE TABLE venue_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pc', 'ps5', 'xbox', 'vr', 'turf')),
  specifications TEXT,
  price_per_hour NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. OFFERS Table
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  resource_id UUID REFERENCES venue_resources(id) ON DELETE CASCADE NOT NULL,
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
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  walk_in_customer_name TEXT,
  walk_in_customer_phone TEXT,
  walk_in_actual_start_time TEXT,
  walk_in_actual_end_time TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SLOTS Table
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  resource_id UUID REFERENCES venue_resources(id) ON DELETE CASCADE NOT NULL,
  slot_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'held', 'booked', 'blocked')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  held_until TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_resource_slot UNIQUE (resource_id, slot_date, start_time)
);

-- 7. REVIEWS Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT NOT NULL,
  owner_reply TEXT,
  owner_replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. COIN_TRANSACTIONS Table
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. NOTIFICATIONS Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'reminder', 'coins', 'promotion', 'review', 'system', 'owner', 'admin')),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ADMIN_LOGS Table
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('venue', 'user', 'booking')),
  target_id UUID NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
--  🎮 GARF SQUAD SOCIAL LAYER TABLES
-- =========================================================================

-- 11. SQUAD_PROFILES Table
CREATE TABLE squad_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
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
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('gaming', 'sports', 'mixed', 'casual')),
  squad_code TEXT UNIQUE NOT NULL,
  cover_image TEXT,
  city TEXT NOT NULL,
  game_or_sport TEXT,
  max_members INTEGER DEFAULT 20 NOT NULL,
  is_private BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. SQUAD_MEMBERS Table
CREATE TABLE squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'requested', 'removed', 'left')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_squad_member UNIQUE (squad_id, user_id)
);

-- 14. POLLS Table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
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
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  selected_options INTEGER[] NOT NULL, -- index array of chosen options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_poll_vote UNIQUE (poll_id, user_id)
);

-- 16. PLAYER_NEEDED_POSTS Table
CREATE TABLE player_needed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  city TEXT NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
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
CREATE TABLE player_needed_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES player_needed_posts(id) ON DELETE CASCADE NOT NULL,
  responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_player_response UNIQUE (post_id, responder_id)
);

-- 18. MESSAGES Table (supports global_city, squad, and direct chat messages!)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('global_city', 'squad', 'direct')),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT,
  content TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'poll', 'squad_invite', 'booking_share', 'player_needed', 'gif')),
  poll_id UUID REFERENCES polls(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  player_needed_id UUID REFERENCES player_needed_posts(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. DM_THREADS Table
CREATE TABLE dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_preview TEXT NOT NULL,
  user1_unread_count INTEGER DEFAULT 0 NOT NULL,
  user2_unread_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_dm_users UNIQUE (user1_id, user2_id)
);

-- 20. NEARBY_CHECKINS Table
CREATE TABLE nearby_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  want_to_meet BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. SQUAD_INVITES Table
CREATE TABLE squad_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invited_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. SQUAD_EVENTS Table
CREATE TABLE squad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
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
CREATE TABLE gaming_equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE turf_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE equipment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES gaming_equipments(id) ON DELETE CASCADE NOT NULL,
  quantity_used INTEGER DEFAULT 1 NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('online_booking', 'walk_in')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  walk_in_id UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. WALK_IN_SESSIONS Table
CREATE TABLE walk_in_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES gaming_equipments(id) ON DELETE SET NULL,
  turf_id UUID REFERENCES turf_details(id) ON DELETE SET NULL,
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
CREATE TABLE turf_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  turf_id UUID REFERENCES turf_details(id) ON DELETE CASCADE NOT NULL,
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

-- =========================================================================
--  📈 PERFORMANCE OPTIMIZING INDEXES
-- =========================================================================
CREATE INDEX idx_slots_search ON slots(resource_id, slot_date);
CREATE INDEX idx_messages_squad ON messages(squad_id) WHERE type = 'squad';
CREATE INDEX idx_messages_dm ON messages(sender_id, receiver_id) WHERE type = 'direct';
CREATE INDEX idx_bookings_date ON bookings(booking_date);
