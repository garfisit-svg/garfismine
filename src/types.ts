/**
 * GARF Types definitions
 * Based on the 10 core tables of Gaming Arena & Recreation Finder
 */

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'owner' | 'admin' | 'owner_pending';
  garf_coins: number;
  referral_code: string;
  referred_by: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  city: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  no_show_count?: number;
  pay_at_venue_blocked?: boolean;
  upi_id?: string;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  type: 'gaming_cafe' | 'turf' | 'both';
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  cover_image: string | null;
  gallery_images: string[];
  amenities: Array<'wifi' | 'ac' | 'parking' | 'food_counter' | 'washroom' | 'lockers' | 'cctv' | 'power_backup'>;
  games_available: string[];
  price_per_hour: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_suspended: boolean;
  operating_hours_start: string; // "09:00"
  operating_hours_end: string; // "23:00"
  operating_days: string[]; // ['Monday', 'Tuesday', ...]
  commission_percent: number;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface VenueResource {
  id: string;
  venue_id: string;
  name: string;
  type: 'pc' | 'ps5' | 'xbox' | 'vr' | 'turf';
  specifications: string | null;
  price_per_hour: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Slot {
  id: string;
  venue_id: string;
  resource_id: string;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // "10:00"
  end_time: string; // "11:00"
  status: 'available' | 'held' | 'booked' | 'blocked';
  booking_id: string | null;
  held_until: string | null; // ISO Timestamp
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  booking_ref: string; // GARF-XXXXXX
  customer_id: string;
  venue_id: string;
  resource_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // "10:00"
  end_time: string; // "12:00"
  duration_hours: number;
  base_amount: number;
  discount_amount: number;
  coins_used: number;
  coins_discount_amount: number;
  platform_fee: number; // default 5
  final_amount: number;
  payment_method: 'online' | 'pay_at_venue' | 'walk_in' | 'token_advance';
  payment_status: 'pending' | 'completed' | 'refunded' | 'partial_refund';
  booking_status: 'held' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  hold_expires_at: string | null; // ISO Timestamp
  advance_paid_amount?: number;
  checked_in_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount: number;
  garf_coins_earned: number;
  offer_id: string | null;
  walk_in_customer_name: string | null;
  walk_in_customer_phone: string | null;
  walk_in_actual_start_time?: string | null; // e.g. "11:15"
  walk_in_actual_end_time?: string | null; // e.g. "12:15"
  quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  venue_id: string;
  rating: number; // 1 to 5
  comment: string;
  owner_reply: string | null;
  owner_replied_at: string | null;
  created_at: string;
}

export type CoinTransactionType =
  | 'booking_earn'
  | 'review_earn'
  | 'referral_signup'
  | 'referral_booking'
  | 'birthday_bonus'
  | 'streak_bonus'
  | 'welcome_bonus'
  | 'redemption'
  | 'cancellation_restore'
  | 'admin_adjust';

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number; // Positive for earned, negative for spent
  type: CoinTransactionType;
  description: string;
  reference_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface Offer {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  max_discount_amount: number | null;
  min_booking_hours: number;
  valid_days: string[]; // ['Monday', 'Tuesday', ...]
  valid_from_time: string | null; // "09:00"
  valid_to_time: string | null; // "22:00"
  valid_from_date: string | null; // YYYY-MM-DD
  valid_to_date: string | null; // YYYY-MM-DD
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'reminder' | 'coins' | 'promotion' | 'review' | 'system' | 'owner' | 'admin';
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string; // "verified_venue" | "suspended_user" | ...
  target_type: 'venue' | 'user' | 'booking';
  target_id: string;
  details: string | null;
  created_at: string;
}

// ==========================================
// 🎮 GARF SQUAD SOCIAL LAYER TYPES
// ==========================================

export interface GarfSquadProfile {
  id: string; // references Profile.id
  username: string; // unique, no spaces, like "rahul_gamer"
  gamer_tag: string | null; // gaming alias
  bio: string | null; // max 150 chars
  favorite_games: string[];
  favorite_sports: string[];
  preferred_city: string;
  is_online: boolean;
  last_seen: string;
  total_squads_joined: number;
  is_profile_public: boolean;
  created_at: string;
}

export interface Squad {
  id: string;
  name: string;
  description: string | null;
  type: 'gaming' | 'sports' | 'mixed' | 'casual';
  squad_code: string; // 6 character unique code to join
  cover_image: string | null;
  city: string;
  game_or_sport: string | null;
  max_members: number;
  is_private: boolean;
  created_by: string; // references profiles.id
  venue_id: string | null; // references venues.id
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'active' | 'invited' | 'requested' | 'removed' | 'left';
  invited_by: string | null;
  joined_at: string | null;
  invited_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  type: 'global_city' | 'squad' | 'direct';
  sender_id: string;
  squad_id: string | null;
  receiver_id: string | null;
  city: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'poll' | 'squad_invite' | 'booking_share' | 'player_needed' | 'gif';
  poll_id: string | null;
  booking_id: string | null;
  player_needed_id: string | null; // looking for player post Id
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  reply_to_id: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  created_by: string;
  squad_id: string | null;
  city: string | null;
  question: string;
  options: string[];
  expires_at: string;
  allow_multiple_choice: boolean;
  is_closed: boolean;
  total_votes: number;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: number[]; // indexes of chosen options
  created_at: string;
}

export interface PlayerNeededPost {
  id: string;
  posted_by: string;
  city: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  game_or_sport: string;
  players_needed: number;
  players_joined: number;
  booking_date: string | null;
  booking_time: string | null;
  venue_booked: boolean;
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface PlayerNeededResponse {
  id: string;
  post_id: string;
  responder_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface DirectMessageThread {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  last_message_preview: string;
  user1_unread_count: number;
  user2_unread_count: number;
  created_at: string;
}

export interface NearbyCheckin {
  id: string;
  user_id: string;
  venue_id: string;
  booking_id: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  is_active: boolean;
  want_to_meet: boolean;
  created_at: string;
}

export interface SquadInvite {
  id: string;
  squad_id: string;
  invited_by: string;
  invited_user_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  expires_at: string;
  created_at: string;
}

export interface SquadEvent {
  id: string;
  squad_id: string;
  created_by: string;
  title: string;
  event_date: string;
  event_time: string;
  venue_id: string | null;
  game_or_sport: string;
  max_participants: number;
  notes: string | null;
  participants: Record<string, 'going' | 'maybe' | 'not_going'>;
  created_at: string;
}

// ==========================================
// 🏗️ GARF OPERATIONAL MANAGEMENT LAYER (REBUILT)
// ==========================================

export interface GamingEquipment {
  id: string;
  venue_id: string;
  equipment_type: 'pc' | 'ps5' | 'ps4' | 'xbox_series_x' | 'xbox_one' | 'vr_headset' | 'racing_sim' | 'arcade';
  custom_name: string;
  total_quantity: number;
  available_quantity: number;
  specifications: string;
  price_per_hour: number;
  per_head_or_per_station: 'per_station' | 'per_head';
  min_booking_hours: number;
  games_available: string[];
  accessories_included: string[];
  is_active: boolean;
  photos: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TurfDetails {
  id: string;
  venue_id: string;
  turf_name: string;
  turf_type: 'football_5aside' | 'football_7aside' | 'football_11aside' | 'cricket_box' | 'cricket_full' | 'badminton' | 'basketball' | 'volleyball' | 'tennis' | 'multi_sport';
  sports_allowed: string[];
  surface_type: 'natural_grass' | 'synthetic_turf' | 'concrete' | 'wooden' | 'clay_court';
  dimensions: string | null;
  capacity_per_team: number;
  total_capacity: number;
  has_flood_lights: boolean;
  has_changing_room: boolean;
  has_equipment_rental: boolean;
  equipment_rental_details: string | null;
  hourly_rate: number;
  weekend_rate: number | null;
  peak_hour_rate: number | null;
  peak_hours_start: string | null;
  peak_hours_end: string | null;
  advance_booking_discount: number | null;
  advance_booking_min_hours: number;
  per_head_rate: number | null;
  min_booking_hours: number;
  requires_full_payment: boolean;
  is_active: boolean;
  photos: string[];
  equipment_rentals?: Array<{ name: string; price: number }>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentSession {
  id: string;
  venue_id: string;
  equipment_id: string;
  quantity_used: number;
  session_type: 'online_booking' | 'walk_in';
  booking_id: string | null;
  walk_in_id: string | null;
  started_at: string;
  expected_end_at: string;
  actual_end_at: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface WalkInSession {
  id: string;
  venue_id: string;
  equipment_id?: string;
  turf_id?: string;
  quantity_used: number;
  customer_name: string | null;
  customer_phone: string | null;
  number_of_players: number;
  amount_per_hour?: number;
  payment_type: 'cash' | 'upi';
  started_at: string;
  expected_duration_hours: number;
  expected_end_at: string;
  actual_end_at: string | null;
  total_amount: number | null;
  status: 'active' | 'completed';
  notes: string | null;
  sport_being_played?: string;
  equipment_rental_items?: string[];
  created_at: string;
}

export interface TurfBooking {
  id: string;
  booking_id: string;
  turf_id: string;
  number_of_players: number;
  sport_being_played: string;
  equipment_rental_requested: boolean;
  equipment_rental_items: string[];
  pricing_type_used: 'hourly' | 'per_head' | 'peak' | 'weekend';
  rate_applied: number;
  advance_discount_applied: boolean;
  discount_percentage: number;
  created_at: string;
}


