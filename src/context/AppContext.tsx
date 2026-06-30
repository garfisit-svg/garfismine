import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Profile, Venue, VenueResource, Slot, Booking, Review, 
  CoinTransaction, Offer, Notification, AdminLog, CoinTransactionType,
  GarfSquadProfile, Squad, SquadMember, Message, Poll, PollVote,
  PlayerNeededPost, PlayerNeededResponse, DirectMessageThread, NearbyCheckin,
  SquadInvite, SquadEvent, GamingEquipment, TurfDetails, EquipmentSession,
  WalkInSession, TurfBooking
} from '../types';

interface AppContextType {
  profiles: Profile[];
  venues: Venue[];
  resources: VenueResource[];
  slots: Slot[];
  bookings: Booking[];
  reviews: Review[];
  coinTransactions: CoinTransaction[];
  offers: Offer[];
  notifications: Notification[];
  adminLogs: AdminLog[];
  currentUser: Profile | null;
  
  // Operational states
  gamingEquipments: GamingEquipment[];
  setGamingEquipments: React.Dispatch<React.SetStateAction<GamingEquipment[]>>;
  turfDetails: TurfDetails[];
  setTurfDetails: React.Dispatch<React.SetStateAction<TurfDetails[]>>;
  equipmentSessions: EquipmentSession[];
  setEquipmentSessions: React.Dispatch<React.SetStateAction<EquipmentSession[]>>;
  walkInSessions: WalkInSession[];
  setWalkInSessions: React.Dispatch<React.SetStateAction<WalkInSession[]>>;
  turfBookings: TurfBooking[];
  setTurfBookings: React.Dispatch<React.SetStateAction<TurfBooking[]>>;
  
  // Auth actions
  signUp: (data: { full_name: string, email: string, phone: string, d_o_b?: string, city?: string, referral_code?: string, password?: string, role?: 'customer' | 'owner' | 'admin' | 'owner_pending', avatar_url?: string }) => Promise<Profile>;
  logIn: (email: string) => Promise<Profile>;
  logOut: () => void;
  logoutUser: () => void;
  updateProfile: (profileData: Partial<Profile>) => void;
  deleteAccount: () => void;
  verifyEmailToken: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message: string; token: string }>;
  
  // Venue owner actions
  registerVenue: (
    venueData: Omit<Venue, 'id' | 'owner_id' | 'rating' | 'total_reviews' | 'is_verified' | 'is_active' | 'is_featured' | 'is_suspended'>, 
    resourcesData: Array<Omit<VenueResource, 'id' | 'venue_id' | 'created_at'>>,
    detailedEquipments?: Array<Omit<GamingEquipment, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>,
    detailedTurfs?: Array<Omit<TurfDetails, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ) => void;
  registerDetailedVenue: (
    venueData: Omit<Venue, 'id' | 'owner_id' | 'rating' | 'total_reviews' | 'is_verified' | 'is_active' | 'is_featured' | 'is_suspended' | 'created_at'>,
    equipments: Array<Omit<GamingEquipment, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>,
    turfs: Array<Omit<TurfDetails, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ) => Promise<string>;
  updateVenue: (venueId: string, venueData: Partial<Venue>) => void;
  deleteVenue: (venueId: string) => void;
  addResource: (venueId: string, resource: Omit<VenueResource, 'id' | 'venue_id' | 'created_at'>) => void;
  updateResource: (resourceId: string, resourceData: Partial<VenueResource>) => void;
  deleteResource: (resourceId: string) => void;
  createOffer: (offerData: Omit<Offer, 'id' | 'created_at' | 'usage_count'>) => void;
  deactivateOffer: (offerId: string) => void;
  replyToReview: (reviewId: string, reply: string) => void;
  
  // Action tools for walk-in management
  addDetailedWalkIn: (walkInData: Omit<WalkInSession, 'id' | 'actual_end_at' | 'status' | 'created_at'>) => void;
  endDetailedWalkIn: (walkInId: string, customAmountCollected: number, paymentType: 'cash' | 'upi') => void;

  
  // Admin actions
  verifyVenue: (venueId: string) => void;
  rejectVenue: (venueId: string, reason: string) => void;
  toggleFeatureVenue: (venueId: string) => void;
  suspendVenue: (venueId: string, reason: string) => void;
  reactivateVenue: (venueId: string) => void;
  changeUserRole: (userId: string, newRole: 'customer' | 'owner' | 'admin') => void;
  suspendUser: (userId: string, reason: string) => void;
  reactivateUser: (userId: string) => void;
  adjustUserCoins: (userId: string, amount: number, reason: string) => void;
  updatePlatformSettings: (settings: { commissionPercent?: number, platformFee?: number }) => void;
  
  // Customer Booking actions
  createBookingHold: (data: { venueId: string, resourceId: string, date: string, slots: string[], coinsToUse: number, offerId: string | null, paymentMethod: 'online' | 'pay_at_venue' | 'token_advance' }) => Promise<Booking>;
  confirmOnlineBooking: (bookingId: string, upiTransactionId?: string) => Promise<Booking>;
  cancelBooking: (bookingId: string, reason: string) => Promise<{ refund: number; coinsRestored: number }>;
  
  // Owner operation actions
  ownerCheckIn: (bookingId: string) => void;
  ownerExtendHold: (bookingId: string) => void;
  ownerReleaseSlot: (bookingId: string) => void;
  addWalkInBooking: (data: { resourceId: string, date: string, slots: string[], customerName?: string, customerPhone?: string, pricePerHr?: number, paymentBy: 'Cash' | 'UPI', actualStartTime?: string, actualEndTime?: string }) => void;
  ownerNoShow: (bookingId: string) => void;
  ownerCompleteBooking: (bookingId: string) => void;
  bulkBlockSlots: (resourceId: string, date: string, slots: string[], reason: string) => void;
  bulkUnblockSlots: (resourceId: string, date: string, slots: string[]) => void;
  generateSlotsForNext7Days: (resourceId: string) => void;
  
  // Utility actions
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  submitReview: (bookingId: string, rating: number, comment: string) => void;
  
  // Platform configuration details
  commissionPercent: number;
  platformFee: number;
  setPlatformFee: React.Dispatch<React.SetStateAction<number>>;
  welcomeBonusCoins: number;
  setWelcomeBonusCoins: React.Dispatch<React.SetStateAction<number>>;
  birthdayBonusCoins: number;
  setBirthdayBonusCoins: React.Dispatch<React.SetStateAction<number>>;

  // Admin aliases for DashboardPage integration
  updateUserRole: (userId: string, newRole: 'customer' | 'owner' | 'admin') => void;
  toggleUserSuspension: (userId: string) => void;
  toggleVenueVerification: (venueId: string) => void;
  toggleVenueActiveState: (venueId: string) => void;

  // Garf Squad States
  squadProfiles: GarfSquadProfile[];
  squads: Squad[];
  squadMembers: SquadMember[];
  messages: Message[];
  polls: Poll[];
  pollVotes: PollVote[];
  playerNeededPosts: PlayerNeededPost[];
  playerNeededResponses: PlayerNeededResponse[];
  dmThreads: DirectMessageThread[];
  nearbyCheckins: NearbyCheckin[];
  squadInvites: SquadInvite[];
  squadEvents: SquadEvent[];

  // Garf Squad Actions
  createSquadProfile: (data: { username: string; gamer_tag: string | null; bio: string | null; favorite_games: string[]; favorite_sports: string[]; preferred_city: string }) => GarfSquadProfile;
  updateSquadProfile: (data: Partial<GarfSquadProfile>) => void;
  createSquad: (data: { name: string; description: string | null; type: Squad['type']; city: string; game_or_sport: string | null; max_members: number; is_private: boolean; venue_id: string | null; cover_image: string | null }) => Squad;
  joinSquadWithCode: (code: string) => Promise<Squad>;
  joinPublicSquad: (squadId: string) => void;
  leaveSquad: (squadId: string) => void;
  acceptSquadJoinRequest: (memberRecordId: string) => void;
  declineSquadJoinRequest: (memberRecordId: string) => void;
  editSquad: (squadId: string, data: Partial<Squad>) => void;
  deleteSquad: (squadId: string) => void;
  sendMessage: (data: { type: Message['type']; squad_id: string | null; receiver_id: string | null; city: string | null; content: string | null; message_type: Message['message_type']; poll_id?: string | null; booking_id?: string | null; player_needed_id?: string | null }) => Message;
  deleteMessage: (messageId: string) => void;
  replyToMessage: (replyToId: string, contentStr: string) => Message;
  createPoll: (data: { question: string; options: string[]; expires_at: string; allow_multiple_choice: boolean; squad_id: string | null; city: string | null }) => Poll;
  voteInPoll: (pollId: string, selectedOptions: number[]) => void;
  createPlayerNeededPost: (data: { city: string; venue_id: string | null; title: string; description: string | null; game_or_sport: string; players_needed: number; booking_date: string | null; booking_time: string | null; venue_booked: boolean; expires_at: string; share_in_global?: boolean; share_in_squads?: boolean }) => PlayerNeededPost;
  requestToJoinPlayerNeeded: (postId: string, message: string | null) => void;
  respondToPlayerNeededJoin: (responseId: string, status: 'accepted' | 'rejected') => void;
  managePlayerNeededPost: (postId: string, action: 'fill' | 'cancel') => void;
  sendSquadInvite: (squadId: string, invitedUserId: string, message: string | null) => void;
  respondToSquadInvite: (inviteId: string, status: 'accepted' | 'declined') => void;
  createSquadEvent: (data: { squad_id: string; title: string; event_date: string; event_time: string; venue_id: string | null; game_or_sport: string; max_participants: number; notes: string | null }) => SquadEvent;
  rsvpToSquadEvent: (eventId: string, rsvp: 'going' | 'maybe' | 'not_going') => void;
  updateNearbyCheckinMeetStatus: (status: boolean) => void;
  checkoutNearbyCheckin: () => void;
  
  // Geolocation city detection
  detectedCity: string;
  isDetectingCity: boolean;
  detectUserCity: () => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper for dynamic seed date adjustment (to keep dates centered around today)
const getOffsetDateString = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // One-time purge of old seeded demo data so we start fresh and ready for real venues!
  const PURGE_KEY = 'garf_purged_dummy_data_v2';
  if (!localStorage.getItem(PURGE_KEY)) {
    const keysToClear = [
      'garf_profiles',
      'garf_current_user',
      'garf_venues',
      'garf_resources',
      'garf_slots',
      'garf_bookings',
      'garf_reviews',
      'garf_coin_transactions',
      'garf_offers',
      'garf_notifications',
      'garf_admin_logs',
      'garf_gaming_equipments',
      'garf_turf_details',
      'garf_equipment_sessions',
      'garf_walk_in_sessions',
      'garf_turf_bookings',
      'garf_squad_profiles',
      'garf_squads',
      'garf_squad_members',
      'garf_messages',
      'garf_polls',
      'garf_poll_votes',
      'garf_player_needed_posts',
      'garf_player_needed_responses',
      'garf_dm_threads',
      'garf_nearby_checkins',
      'garf_squad_invites',
      'garf_squad_events'
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(PURGE_KEY, 'true');
  }

  // Define default platform settings
  const [commissionPercent, setCommissionPercent] = useState<number>(() => {
    return Number(localStorage.getItem('garf_commission_percent') || '10');
  });
  const [platformFee, setPlatformFee] = useState<number>(() => {
    return Number(localStorage.getItem('garf_platform_fee') || '5');
  });

  // Geolocation city detection state
  const [detectedCity, setDetectedCity] = useState<string>(() => {
    return localStorage.getItem('garf_detected_city') || 'Mumbai';
  });
  const [isDetectingCity, setIsDetectingCity] = useState<boolean>(false);

  const detectUserCity = async (): Promise<string> => {
    if (!navigator.geolocation) {
      return 'Mumbai';
    }
    setIsDetectingCity(true);
    return new Promise<string>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const SUPPORTED_CITIES = [
            { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
            { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
            { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
            { name: 'Pune', lat: 18.5204, lng: 73.8567 },
            { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
            { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
            { name: 'Jaipur', lat: 26.9124, lng: 75.7873 }
          ];
          let nearestCity = 'Mumbai';
          let minDistance = Infinity;
          for (const city of SUPPORTED_CITIES) {
            const d = Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2);
            if (d < minDistance) {
              minDistance = d;
              nearestCity = city.name;
            }
          }
          setDetectedCity(nearestCity);
          localStorage.setItem('garf_detected_city', nearestCity);
          setIsDetectingCity(false);
          resolve(nearestCity);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setIsDetectingCity(false);
          resolve('Mumbai');
        },
        { timeout: 8000 }
      );
    });
  };

  useEffect(() => {
    if (!localStorage.getItem('garf_detected_city')) {
      detectUserCity();
    }
  }, []);

  // Load state from localStorage or seed
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('garf_profiles');
    if (saved) return JSON.parse(saved);

    const seed: Profile[] = [];
    return seed;
  });

  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('garf_current_user');
    if (saved && saved !== 'null' && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved) as Profile;
        if (parsed && parsed.id) {
          const dbProfile = JSON.parse(localStorage.getItem('garf_profiles') || '[]').find((p: Profile) => p && p.id === parsed.id);
          return dbProfile || parsed;
        }
      } catch (err) {
        console.error('Failed to parse current user:', err);
      }
    }
    return null;
  });

  const [venues, setVenues] = useState<Venue[]>(() => {
    const saved = localStorage.getItem('garf_venues');
    if (saved) return JSON.parse(saved);
    const seed: Venue[] = [];
    return seed;
  });

  const [resources, setResources] = useState<VenueResource[]>(() => {
    const saved = localStorage.getItem('garf_resources');
    if (saved) return JSON.parse(saved);
    const seed: VenueResource[] = [];
    return seed;
  });

  // Unique slots state which gets populated for current +7 days automatically
  const [slots, setSlots] = useState<Slot[]>(() => {
    const saved = localStorage.getItem('garf_slots');
    if (saved) return JSON.parse(saved);
    return []; // Will build dynamically below!
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('garf_bookings');
    if (saved) return JSON.parse(saved);
    const seed: Booking[] = [];
    return seed;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('garf_reviews');
    if (saved) return JSON.parse(saved);
    const seed: Review[] = [];
    return seed;
  });

  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>(() => {
    const saved = localStorage.getItem('garf_coin_transactions');
    if (saved) return JSON.parse(saved);
    const seed: CoinTransaction[] = [];
    return seed;
  });

  const [offers, setOffers] = useState<Offer[]>(() => {
    const saved = localStorage.getItem('garf_offers');
    if (saved) return JSON.parse(saved);
    const seed: Offer[] = [];
    return seed;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('garf_notifications');
    if (saved) return JSON.parse(saved);
    const seed: Notification[] = [];
    return seed;
  });

  const [adminLogs, setAdminLogs] = useState<AdminLog[]>(() => {
    const saved = localStorage.getItem('garf_admin_logs');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // ==========================================
  // OPERATIONAL DETAILED STATES & SEEDS (NEW SYSTEM)
  // ==========================================
  const [gamingEquipments, setGamingEquipments] = useState<GamingEquipment[]>(() => {
    const saved = localStorage.getItem('garf_gaming_equipments');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [turfDetails, setTurfDetails] = useState<TurfDetails[]>(() => {
    const saved = localStorage.getItem('garf_turf_details');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [equipmentSessions, setEquipmentSessions] = useState<EquipmentSession[]>(() => {
    const saved = localStorage.getItem('garf_equipment_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [walkInSessions, setWalkInSessions] = useState<WalkInSession[]>(() => {
    const saved = localStorage.getItem('garf_walk_in_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [turfBookings, setTurfBookings] = useState<TurfBooking[]>(() => {
    const saved = localStorage.getItem('garf_turf_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('garf_gaming_equipments', JSON.stringify(gamingEquipments));
  }, [gamingEquipments]);

  useEffect(() => {
    localStorage.setItem('garf_turf_details', JSON.stringify(turfDetails));
  }, [turfDetails]);

  useEffect(() => {
    localStorage.setItem('garf_equipment_sessions', JSON.stringify(equipmentSessions));
  }, [equipmentSessions]);

  useEffect(() => {
    localStorage.setItem('garf_walk_in_sessions', JSON.stringify(walkInSessions));
  }, [walkInSessions]);

  useEffect(() => {
    localStorage.setItem('garf_turf_bookings', JSON.stringify(turfBookings));
  }, [turfBookings]);

  // Backward compatibility projection syncing logic
  useEffect(() => {
    const newResList: VenueResource[] = [];
    gamingEquipments.forEach(eq => {
      newResList.push({
        id: eq.id,
        venue_id: eq.venue_id,
        name: eq.custom_name,
        type: eq.equipment_type === 'pc' ? 'pc' : (eq.equipment_type === 'vr_headset' ? 'vr' : (eq.equipment_type.includes('xbox') ? 'xbox' : 'ps5')),
        specifications: eq.specifications,
        price_per_hour: eq.price_per_hour,
        is_active: eq.is_active,
        sort_order: eq.sort_order,
        created_at: eq.created_at
      });
    });
    turfDetails.forEach(turf => {
      newResList.push({
        id: turf.id,
        venue_id: turf.venue_id,
        name: turf.turf_name,
        type: 'turf',
        specifications: turf.dimensions || 'Standard',
        price_per_hour: turf.hourly_rate,
        is_active: turf.is_active,
        sort_order: turf.sort_order,
        created_at: turf.created_at
      });
    });
    const currentSerialized = JSON.stringify(resources);
    const newSerialized = JSON.stringify(newResList);
    if (currentSerialized !== newSerialized) {
      setResources(newResList);
    }
  }, [gamingEquipments, turfDetails, resources]);

  // ==========================================
  // Admin custom setting coins
  // ==========================================
  const [welcomeBonusCoins, setWelcomeBonusCoins] = useState<number>(() => {
    return Number(localStorage.getItem('garf_welcome_bonus_coins') || '50');
  });
  useEffect(() => {
    localStorage.setItem('garf_welcome_bonus_coins', welcomeBonusCoins.toString());
  }, [welcomeBonusCoins]);

  const [birthdayBonusCoins, setBirthdayBonusCoins] = useState<number>(() => {
    return Number(localStorage.getItem('garf_birthday_bonus_coins') || '50');
  });
  useEffect(() => {
    localStorage.setItem('garf_birthday_bonus_coins', birthdayBonusCoins.toString());
  }, [birthdayBonusCoins]);

  // ==========================================
  // GARF SQUAD Social States & Seeds
  // ==========================================
  const [squadProfiles, setSquadProfiles] = useState<GarfSquadProfile[]>(() => {
    const saved = localStorage.getItem('garf_squad_profiles');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [squads, setSquads] = useState<Squad[]>(() => {
    const saved = localStorage.getItem('garf_squads');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [squadMembers, setSquadMembers] = useState<SquadMember[]>(() => {
    const saved = localStorage.getItem('garf_squad_members');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('garf_messages');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [polls, setPolls] = useState<Poll[]>(() => {
    const saved = localStorage.getItem('garf_polls');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [pollVotes, setPollVotes] = useState<PollVote[]>(() => {
    const saved = localStorage.getItem('garf_poll_votes');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [playerNeededPosts, setPlayerNeededPosts] = useState<PlayerNeededPost[]>(() => {
    const saved = localStorage.getItem('garf_player_needed_posts');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [playerNeededResponses, setPlayerNeededResponses] = useState<PlayerNeededResponse[]>(() => {
    const saved = localStorage.getItem('garf_player_needed_responses');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>(() => {
    const saved = localStorage.getItem('garf_dm_threads');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [nearbyCheckins, setNearbyCheckins] = useState<NearbyCheckin[]>(() => {
    const saved = localStorage.getItem('garf_nearby_checkins');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [squadInvites, setSquadInvites] = useState<SquadInvite[]>(() => {
    const saved = localStorage.getItem('garf_squad_invites');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [squadEvents, setSquadEvents] = useState<SquadEvent[]>(() => {
    const saved = localStorage.getItem('garf_squad_events');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Write squad states to local storage on edits
  useEffect(() => {
    localStorage.setItem('garf_squad_profiles', JSON.stringify(squadProfiles));
  }, [squadProfiles]);

  useEffect(() => {
    localStorage.setItem('garf_squads', JSON.stringify(squads));
  }, [squads]);

  useEffect(() => {
    localStorage.setItem('garf_squad_members', JSON.stringify(squadMembers));
  }, [squadMembers]);

  useEffect(() => {
    localStorage.setItem('garf_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('garf_polls', JSON.stringify(polls));
  }, [polls]);

  useEffect(() => {
    localStorage.setItem('garf_poll_votes', JSON.stringify(pollVotes));
  }, [pollVotes]);

  useEffect(() => {
    localStorage.setItem('garf_player_needed_posts', JSON.stringify(playerNeededPosts));
  }, [playerNeededPosts]);

  useEffect(() => {
    localStorage.setItem('garf_player_needed_responses', JSON.stringify(playerNeededResponses));
  }, [playerNeededResponses]);

  useEffect(() => {
    localStorage.setItem('garf_dm_threads', JSON.stringify(dmThreads));
  }, [dmThreads]);

  useEffect(() => {
    localStorage.setItem('garf_nearby_checkins', JSON.stringify(nearbyCheckins));
  }, [nearbyCheckins]);

  useEffect(() => {
    localStorage.setItem('garf_squad_invites', JSON.stringify(squadInvites));
  }, [squadInvites]);

  useEffect(() => {
    localStorage.setItem('garf_squad_events', JSON.stringify(squadEvents));
  }, [squadEvents]);

  // Write all state hook dependencies to localStorage on changes
  useEffect(() => {
    localStorage.setItem('garf_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('garf_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('garf_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('garf_venues', JSON.stringify(venues));
  }, [venues]);

  useEffect(() => {
    localStorage.setItem('garf_resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('garf_slots', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('garf_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('garf_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('garf_coin_transactions', JSON.stringify(coinTransactions));
  }, [coinTransactions]);

  useEffect(() => {
    localStorage.setItem('garf_offers', JSON.stringify(offers));
  }, [offers]);

  useEffect(() => {
    localStorage.setItem('garf_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('garf_admin_logs', JSON.stringify(adminLogs));
  }, [adminLogs]);

  // DYNAMIC SLY SLOT GENERATION (to guarantee active bookable slots exist relative to actual local date always!)
  useEffect(() => {
    // Generate slots for today and next 7 days for each active resource
    const allSlots = [...slots];
    let slotsAdded = false;

    resources.forEach(res => {
      // Find associated venue
      const v = venues.find(venue => venue.id === res.venue_id);
      if (!v) return;

      // Start hour and End hour
      const sHour = parseInt((v.operating_hours_start || '09:00').split(':')[0]) || 9;
      const eHour = parseInt((v.operating_hours_end || '23:00').split(':')[0]) || 23;

      for (let i = 0; i < 8; i++) {
        const dateStr = getOffsetDateString(i);

        // Check if slots already exist for this resource on this date
        const exist = allSlots.some(s => s.resource_id === res.id && s.slot_date === dateStr);
        if (!exist) {
          // Generate hourly slots
          for (let hr = sHour; hr < eHour; hr++) {
            const startStr = `${hr.toString().padStart(2, '0')}:00`;
            const endStr = `${(hr + 1).toString().padStart(2, '0')}:00`;

            allSlots.push({
              id: `slot-${res.id}-${dateStr}-${hr}`,
              venue_id: res.venue_id,
              resource_id: res.id,
              slot_date: dateStr,
              start_time: startStr,
              end_time: endStr,
              status: 'available',
              booking_id: null,
              held_until: null,
              blocked_reason: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            slotsAdded = true;
          }
        }
      }
    });

    if (slotsAdded) {
      setSlots(allSlots);
    }
  }, [resources, venues]);

  // ⏰ REAL-TIME PROCESS TIMER: Checks holds & countdowns every 10 seconds!
  // Checks both pending holds (customer pay-at-venue holds, plus in-checkout holds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let updatedBookings = false;
      let updatedSlots = false;

      // 1. Release pay-at-venue expired holds
      const checkedBookings = bookings.map(b => {
        if (b.booking_status === 'held' && b.payment_method === 'pay_at_venue' && b.hold_expires_at) {
          const exp = new Date(b.hold_expires_at);
          if (now > exp) {
            updatedBookings = true;
            addNotificationSilently(b.customer_id, 'Slot Hold Expired ⏳', 'Your booking hold of 15 minutes expired due to check-in timeout. This slot was released.', 'booking');
            return {
              ...b,
              booking_status: 'cancelled' as const,
              payment_status: 'pending' as const, // stays pending but cancelled
              cancellation_reason: 'Hold expired: customer check-in timeout',
              cancelled_at: now.toISOString(),
              updated_at: now.toISOString()
            };
          }
        }
        return b;
      });

      // 2. Release temporary in-checkout locked slots (slots marked held held_until < now)
      const checkedSlots = slots.map(s => {
        if (s.status === 'held' && s.held_until) {
          const exp = new Date(s.held_until);
          if (now > exp) {
            updatedSlots = true;
            // Also if there was a booking associated, cancel it
            if (s.booking_id) {
              const matchedBooking = bookings.find(b => b.id === s.booking_id);
              if (matchedBooking && matchedBooking.booking_status === 'held') {
                updatedBookings = true;
                // Update booking
                const index = checkedBookings.findIndex(cb => cb.id === s.booking_id);
                if (index !== -1) {
                  checkedBookings[index] = {
                    ...checkedBookings[index],
                    booking_status: 'cancelled',
                    cancellation_reason: 'Hold expired',
                    cancelled_at: now.toISOString()
                  };
                }
              }
            }
            return {
              ...s,
              status: 'available' as const,
              booking_id: null,
              held_until: null,
              updated_at: now.toISOString()
            };
          }
        }
        return s;
      });

      if (updatedBookings) {
        setBookings(checkedBookings);
      }
      if (updatedSlots) {
        setSlots(checkedSlots);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [bookings, slots]);

  const addNotificationSilently = (userId: string, title: string, message: string, type: Notification['type']) => {
    const newN: Notification = {
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      action_url: type === 'booking' ? '/my-bookings' : (type === 'coins' ? '/my-coins' : null),
      created_at: new Date().toISOString()
    };
    setNotifications(prev => [newN, ...prev]);
  };

  const addLog = (adminId: string, action: string, targetType: AdminLog['target_type'], targetId: string, details?: string) => {
    const newLog: AdminLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || null,
      created_at: new Date().toISOString()
    };
    setAdminLogs(prev => [newLog, ...prev]);
  };

  // AUTH ACTIONS
  const signUp = async (data: { full_name: string, email: string, phone: string, d_o_b?: string, city?: string, referral_code?: string, password?: string, role?: 'customer' | 'owner' | 'admin' | 'owner_pending', avatar_url?: string }) => {
    // Unique email check
    const exist = profiles.some(p => p?.email?.toLowerCase() === data.email?.toLowerCase()); // basic duplicate catch
    
    // Auto-generate ref code
    const rFour = Math.random().toString(36).substring(2, 6).toUpperCase();
    const myRefCode = `GARF-${rFour}`;

    const token = generateSecureToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const isPreVerified = data.email?.toLowerCase().trim() === 'garfisit@gmail.com';

    const newProfile: Profile = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.full_name)}`,
      role: isPreVerified ? 'admin' : (data.role || 'customer'),
      garf_coins: 10, // welcome bonus
      referral_code: myRefCode,
      referred_by: null,
      date_of_birth: data.d_o_b || null,
      city: data.city || 'Mumbai',
      is_suspended: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      emailVerified: isPreVerified ? true : false,
      verificationToken: isPreVerified ? undefined : token,
      verificationTokenExpires: isPreVerified ? undefined : expires
    };

    if (!isPreVerified) {
      const verifyLink = `${window.location.origin}/explore?verifyToken=${token}`;
      // Dispatch simulated verification email
      setTimeout(() => {
        addNotificationSilently(
          newProfile.id,
          'Verify your email ✉️',
          `Use this link to verify your email address: ${verifyLink}`,
          'system'
        );
        console.log(`[SIMULATED EMAIL SENT TO ${newProfile.email}] Verification link: ${verifyLink}`);
      }, 500);
    }

    // Referral verification (Rule 8)
    if (data.referral_code?.trim()) {
      const parent = profiles.find(p => p.referral_code === data.referral_code?.trim());
      if (parent) {
        newProfile.referred_by = parent.id;
        newProfile.garf_coins = 100; // 50 base + 50 signup bonus

        // Award 100 coins to referrer
        setProfiles(prev => prev.map(p => {
          if (p.id === parent.id) {
            const afterCoins = p.garf_coins + 100;
            // Record coin txn
            const txId = `txn-${Math.random().toString(36).substr(2,9)}`;
            const newTx: CoinTransaction = {
              id: txId,
              user_id: p.id,
              amount: 100,
              type: 'referral_signup',
              description: `Referral sign-up! Friend ${data.full_name} joined with your code.`,
              reference_id: newProfile.id,
              balance_after: afterCoins,
              created_at: new Date().toISOString()
            };
            setCoinTransactions(prevTx => [newTx, ...prevTx]);
            addNotificationSilently(p.id, 'Referral Bonus Received! 🎁', `Friend ${data.full_name} joined with your code! +100 GARF coins are in!`, 'coins');
            return {
              ...p,
              garf_coins: afterCoins,
              updated_at: new Date().toISOString()
            };
          }
          return p;
        }));
      } else {
        throw new Error('Invalid referral code');
      }
    }

    setProfiles(prev => [...prev, newProfile]);
    setCurrentUser(newProfile);

    // Welcome coin transaction
    const txIdWelcome = `txn-${Math.random().toString(36).substr(2,9)}`;
    const txWelcome: CoinTransaction = {
      id: txIdWelcome,
      user_id: newProfile.id,
      amount: newProfile.garf_coins,
      type: 'welcome_bonus',
      description: 'Welcome bonus for joining GARF Arena!',
      reference_id: null,
      balance_after: newProfile.garf_coins,
      created_at: new Date().toISOString()
    };
    setCoinTransactions(prevTx => [txWelcome, ...prevTx]);
    addNotificationSilently(newProfile.id, 'Welcome Bonus! 👋', `Enjoy ${newProfile.garf_coins} GARF Coins on us! Redeem on your next game.`, 'coins');

    return newProfile;
  };

  const logIn = async (email: string) => {
    // Matches hardcoded emails for simulation:
    let profile: Profile | undefined;
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === 'founder@garf.com') {
      profile = profiles.find(p => p.role === 'admin' || p.id === 'user-admin-1');
    } else if (cleanEmail === 'owner@arena.com') {
      profile = profiles.find(p => p.role === 'owner' || p.id === 'user-owner-1');
    } else if (cleanEmail === 'player@garf.com') {
      profile = profiles.find(p => p.id === 'user-customer-1');
    } else {
      // Find inside profiles list by matching custom email if present, or search by name.
      // Since it is simulated, we support direct login for any profile!
      profile = profiles.find(p => p.email?.trim().toLowerCase() === cleanEmail || p.phone === email || p.full_name.toLowerCase().replace(/\s+/g, '') === cleanEmail.split('@')[0].toLowerCase());
    }

    if (!profile) {
      // Create user on-fly so tester doesn't get stuck
      const username = cleanEmail.split('@')[0] || 'player';
      const fullName = username.charAt(0).toUpperCase() + username.slice(1);
      
      const rFour = Math.random().toString(36).substring(2, 6).toUpperCase();
      const myRefCode = `GARF-${rFour}`;
      const token = generateSecureToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const isTestOrAdmin = cleanEmail === 'garfisit@gmail.com' || cleanEmail === 'founder@garf.com' || cleanEmail === 'owner@arena.com' || cleanEmail === 'player@garf.com' || cleanEmail.includes('admin') || cleanEmail.includes('owner') || cleanEmail.includes('player');

      const newP: Profile = {
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        full_name: fullName,
        email: cleanEmail,
        phone: '1234567890',
        avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
        role: cleanEmail === 'garfisit@gmail.com' || cleanEmail.includes('admin') ? 'admin' : (cleanEmail.includes('owner') ? 'owner' : 'customer'),
        garf_coins: 150,
        referral_code: myRefCode,
        referred_by: null,
        date_of_birth: '1998-11-20',
        city: 'Mumbai',
        is_suspended: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        emailVerified: isTestOrAdmin ? true : false,
        verificationToken: isTestOrAdmin ? undefined : token,
        verificationTokenExpires: isTestOrAdmin ? undefined : expires
      };

      if (!isTestOrAdmin) {
        const verifyLink = `${window.location.origin}/explore?verifyToken=${token}`;
        setTimeout(() => {
          addNotificationSilently(
            newP.id,
            'Verify your email address ✉️',
            `Thank you for signing up! Use this secure link to verify your email address: ${verifyLink}`,
            'system'
          );
          console.log(`[SIMULATED EMAIL SENT TO ${newP.email}] Verification link: ${verifyLink}`);
        }, 500);
      }
      
      setProfiles(prev => [...prev, newP]);
      profile = newP;

      // Welcome transaction
      const txId = `txn-${Math.random().toString(36).substr(1,8)}`;
      const tx: CoinTransaction = {
        id: txId,
        user_id: newP.id,
        amount: 150,
        type: 'welcome_bonus',
        description: 'Auto-seed login welcome credits!',
        reference_id: null,
        balance_after: 150,
        created_at: new Date().toISOString()
      };
      setCoinTransactions(prev => [tx, ...prev]);
    }

    if (profile.is_suspended) {
      throw new Error('Your account has been suspended. Contact support at garfisit@gmail.com');
    }

    // CHECK BIRTHDAY BONUS (Rule 9)
    if (profile.date_of_birth) {
      const today = new Date();
      const dob = new Date(profile.date_of_birth);
    // Checked birthday and streak coins disabled as per user simplified requirements.
    }

    setCurrentUser(profile);
    return profile;
  };

  const logOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('garf_current_user');
  };

  const updateProfile = (profileData: Partial<Profile>) => {
    if (!currentUser) return;
    setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, ...profileData, updated_at: new Date().toISOString() } : p));
    setCurrentUser(prev => prev ? { ...prev, ...profileData, updated_at: new Date().toISOString() } : null);
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setProfiles(prev => prev.filter(p => p.id !== uid));
    logOut();
  };

  // VENUE REGISTRATION & OWNER ACTIONS
  const registerVenue = (
    venueData: Omit<Venue, 'id' | 'owner_id' | 'rating' | 'total_reviews' | 'is_verified' | 'is_active' | 'is_featured' | 'is_suspended'>,
    resourcesData: Array<Omit<VenueResource, 'id' | 'venue_id' | 'created_at'>> = [],
    detailedEquipments?: Array<Omit<GamingEquipment, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>,
    detailedTurfs?: Array<Omit<TurfDetails, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!currentUser) return;

    const vId = `venue-${Math.random().toString(36).substr(2, 9)}`;
    const newV: Venue = {
      // safe fallback fields
      state: 'Maharashtra',
      pincode: '400001',
      phone: currentUser.phone || '9999999999',
      email: currentUser.email || 'owner@arena.com',
      operating_hours_start: '09:00',
      operating_hours_end: '23:00',
      operating_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      gallery_images: [],
      ...venueData,
      id: vId,
      owner_id: currentUser.id,
      rating: 0,
      total_reviews: 0,
      is_verified: true,
      is_active: true,
      is_featured: false,
      is_suspended: false,
      commission_percent: 10,
      rejection_reason: null,
      verified_at: null,
      created_at: new Date().toISOString()
    };

    const newRes: VenueResource[] = resourcesData.map((res, i) => ({
      price_per_hour: Number(venueData.price_per_hour) || 150,
      is_active: true,
      ...res,
      type: ((res.type as string) === 'pitch') ? ('turf' as const) : res.type,
      id: `res-${vId}-${i}`,
      venue_id: vId,
      sort_order: i + 1,
      created_at: new Date().toISOString()
    }));

    setVenues(prev => [...prev, newV]);
    setResources(prev => [...prev, ...newRes]);

    if (newV.type === 'gaming_cafe') {
      if (detailedEquipments && detailedEquipments.length > 0) {
        const gEqs: GamingEquipment[] = detailedEquipments.map((eq, i) => ({
          ...eq,
          id: `res-${vId}-${i}`, // sync with resource id
          venue_id: vId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as GamingEquipment));
        setGamingEquipments(prev => [...prev, ...gEqs]);
      } else {
        const gEqs: GamingEquipment[] = newRes.map((r, i) => ({
          id: r.id,
          venue_id: vId,
          equipment_type: r.type === 'pc' ? 'pc' : 'ps5',
          custom_name: r.name,
          total_quantity: 10,
          available_quantity: 10,
          specifications: r.specifications || 'Standard gaming node specs',
          price_per_hour: r.price_per_hour,
          per_head_or_per_station: 'per_station',
          min_booking_hours: 1,
          games_available: ['valorant', 'csgo', 'gta5'],
          accessories_included: ['Headphones', 'Mousepad'],
          is_active: true,
          photos: [],
          sort_order: r.sort_order || (i + 1),
          created_at: r.created_at,
          updated_at: r.created_at
        }));
        setGamingEquipments(prev => [...prev, ...gEqs]);
      }
    } else {
      if (detailedTurfs && detailedTurfs.length > 0) {
        const tfs: TurfDetails[] = detailedTurfs.map((tf, i) => ({
          ...tf,
          id: `res-${vId}-${i}`, // sync with resource id
          venue_id: vId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as TurfDetails));
        setTurfDetails(prev => [...prev, ...tfs]);
      } else {
        const tfs: TurfDetails[] = newRes.map((r, i) => ({
          id: r.id,
          venue_id: vId,
          turf_name: r.name,
          turf_type: 'football_7aside',
          sports_allowed: ['football', 'cricket'],
          surface_type: 'synthetic_turf',
          dimensions: r.specifications || 'Standard 7-a-side dimensions',
          capacity_per_team: 7,
          total_capacity: 14,
          has_flood_lights: true,
          has_changing_room: true,
          has_equipment_rental: true,
          equipment_rental_details: 'Football and bibs included',
          hourly_rate: r.price_per_hour,
          weekend_rate: null,
          peak_hour_rate: null,
          peak_hours_start: null,
          peak_hours_end: null,
          advance_booking_discount: null,
          advance_booking_min_hours: 1,
          per_head_rate: null,
          min_booking_hours: 1,
          requires_full_payment: false,
          is_active: true,
          photos: [],
          sort_order: r.sort_order || (i + 1),
          created_at: r.created_at,
          updated_at: r.created_at
        }));
        setTurfDetails(prev => [...prev, ...tfs]);
      }
    }

    // Generate initial slots for these new resources
    const sHour = parseInt((newV.operating_hours_start || '09:00').split(':')[0]) || 9;
    const eHour = parseInt((newV.operating_hours_end || '23:00').split(':')[0]) || 23;
    const allNewSlots: Slot[] = [];

    newRes.forEach(r => {
      for (let i = 0; i < 8; i++) {
        const dateStr = getOffsetDateString(i);
        for (let hr = sHour; hr < eHour; hr++) {
          const startStr = `${hr.toString().padStart(2, '0')}:00`;
          const endStr = `${(hr + 1).toString().padStart(2, '0')}:00`;
          allNewSlots.push({
            id: `slot-${r.id}-${dateStr}-${hr}`,
            venue_id: vId,
            resource_id: r.id,
            slot_date: dateStr,
            start_time: startStr,
            end_time: endStr,
            status: 'available',
            booking_id: null,
            held_until: null,
            blocked_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    });
    setSlots(prev => [...prev, ...allNewSlots]);

    // Update user role to Owner
    setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, role: 'owner' as const } : p));
    setCurrentUser(prev => prev ? { ...prev, role: 'owner' as const } : null);

    // Notify admins of new pending venue
    profiles.filter(p => p.role === 'admin').forEach(adm => {
      addNotificationSilently(adm.id, 'New Venue Pending Approval 🏢', `Venue "${newV.name}" was registered by ${currentUser.full_name} and is waiting review.`, 'admin');
    });
  };

  const updateVenue = (venueId: string, venueData: Partial<Venue>) => {
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, ...venueData } : v));
  };

  const deleteVenue = (venueId: string) => {
    setVenues(prev => prev.filter(v => v.id !== venueId));
    setResources(prev => prev.filter(r => r.venue_id !== venueId));
    setSlots(prev => prev.filter(s => s.venue_id !== venueId));
  };

  const addResource = (venueIdOrObj: any, resource?: Omit<VenueResource, 'id' | 'venue_id' | 'created_at'>) => {
    let finalVenueId = '';
    let finalResource: any = null;

    if (typeof venueIdOrObj === 'string') {
      finalVenueId = venueIdOrObj;
      finalResource = resource;
    } else if (venueIdOrObj && typeof venueIdOrObj === 'object') {
      finalVenueId = venueIdOrObj.venue_id;
      finalResource = venueIdOrObj;
    }

    if (!finalVenueId) return;

    const newR: VenueResource = {
      ...finalResource,
      id: `res-${finalVenueId}-${Math.random().toString(36).substr(2, 5)}`,
      venue_id: finalVenueId,
      created_at: new Date().toISOString()
    };
    setResources(prev => [...prev, newR]);
  };

  const updateResource = (resourceId: string, resourceData: Partial<VenueResource>) => {
    setResources(prev => prev.map(r => r.id === resourceId ? { ...r, ...resourceData } : r));
  };

  const deleteResource = (resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));
  };

  const createOffer = (offerData: Omit<Offer, 'id' | 'created_at' | 'usage_count'>) => {
    const newOffer: Offer = {
      ...offerData,
      id: `offer-${Math.random().toString(36).substr(2, 9)}`,
      usage_count: 0,
      created_at: new Date().toISOString()
    };
    setOffers(prev => [...prev, newOffer]);
  };

  const deactivateOffer = (offerId: string) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, is_active: false } : o));
  };

  const replyToReview = (reviewId: string, reply: string) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, owner_reply: reply, owner_replied_at: new Date().toISOString() } : r));
  };

  // ADMIN ACTIONS
  const verifyVenue = (venueId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        addNotificationSilently(v.owner_id, 'Venue Verified! 🎉', `Congratulations! Your venue "${v.name}" has been verified and is now live on GARF!`, 'owner');
        return {
          ...v,
          is_verified: true,
          is_active: true,
          verified_at: new Date().toISOString()
        };
      }
      return v;
    }));

    addLog(currentUser.id, 'Verified venue', 'venue', venueId);
  };

  const rejectVenue = (venueId: string, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        addNotificationSilently(v.owner_id, 'Venue Rejected ❌', `Your venue registration for "${v.name}" was not approved. Reason: ${reason}`, 'owner');
        return {
          ...v,
          is_verified: false,
          is_active: false,
          rejection_reason: reason
        };
      }
      return v;
    }));

    addLog(currentUser.id, 'Rejected venue', 'venue', venueId, `Reason: ${reason}`);
  };

  const toggleFeatureVenue = (venueId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    let state = false;
    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        state = !v.is_featured;
        return { ...v, is_featured: state };
      }
      return v;
    }));

    addLog(currentUser.id, state ? 'Featured venue' : 'Unfeatured venue', 'venue', venueId);
  };

  const suspendVenue = (venueId: string, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        addNotificationSilently(v.owner_id, 'Venue Suspended 🚫', `Your venue "${v.name}" was suspended by the administration. Reason: ${reason}`, 'owner');
        return {
          ...v,
          is_active: false,
          is_suspended: true
        };
      }
      return v;
    }));

    addLog(currentUser.id, 'Suspended venue', 'venue', venueId, `Reason: ${reason}`);
  };

  const reactivateVenue = (venueId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        addNotificationSilently(v.owner_id, 'Venue Re-activated! ✅', `Your venue "${v.name}" is back online following administrator review.`, 'owner');
        return {
          ...v,
          is_active: true,
          is_suspended: false
        };
      }
      return v;
    }));

    addLog(currentUser.id, 'Reactivated venue', 'venue', venueId);
  };

  const changeUserRole = (userId: string, newRole: 'customer' | 'owner' | 'admin') => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
    addLog(currentUser.id, `Changed user role to ${newRole}`, 'user', userId);
  };

  const suspendUser = (userId: string, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_suspended: true } : p));
    addLog(currentUser.id, 'Suspended user account', 'user', userId, `Reason: ${reason}`);
  };

  const reactivateUser = (userId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_suspended: false } : p));
    addLog(currentUser.id, 'Reactivated user account', 'user', userId);
  };

  const adjustUserCoins = (userId: string, amount: number, reason: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setProfiles(prev => prev.map(p => {
      if (p.id === userId) {
        const after = p.garf_coins + amount;
        
        // Write txn
        const txId = `txn-adj-${Math.random().toString(36).substr(2,9)}`;
        const tx: CoinTransaction = {
          id: txId,
          user_id: p.id,
          amount,
          type: 'admin_adjust',
          description: `Admin Adjustment: ${reason}`,
          reference_id: null,
          balance_after: after,
          created_at: new Date().toISOString()
        };
        setCoinTransactions(prevTx => [tx, ...prevTx]);
        addNotificationSilently(p.id, 'Wallet Adjusted by Admin 🪙', `Admin adjusted your coins by ${amount > 0 ? '+' : ''}${amount}. Details: ${reason}`, 'coins');
        return {
          ...p,
          garf_coins: after
        };
      }
      return p;
    }));

    addLog(currentUser.id, 'Adjusted user coins', 'user', userId, `Amount: ${amount}, Details: ${reason}`);
  };

  const updatePlatformSettings = (settings: { commissionPercent?: number, platformFee?: number }) => {
    if (!currentUser || currentUser.role !== 'admin') return;

    if (settings.commissionPercent !== undefined) {
      setCommissionPercent(settings.commissionPercent);
      localStorage.setItem('garf_commission_percent', settings.commissionPercent.toString());
      addLog(currentUser.id, 'Updated default commission percent', 'user', currentUser.id, `Value: ${settings.commissionPercent}%`);
    }
    if (settings.platformFee !== undefined) {
      setPlatformFee(settings.platformFee);
      localStorage.setItem('garf_platform_fee', settings.platformFee.toString());
      addLog(currentUser.id, 'Updated customer platform fee', 'user', currentUser.id, `Value: ₹${settings.platformFee}`);
    }
  };

  // CUSTOMER BOOKING FLOW ACTIONS
  const createBookingHold = async (data: {
    venueId: string, 
    resourceId: string, 
    date: string, 
    slots: string[], 
    coinsToUse: number, 
    offerId: string | null, 
    paymentMethod: 'online' | 'pay_at_venue' | 'token_advance'
  }) => {
    if (!currentUser) throw new Error('Authentication required');

    if (currentUser.emailVerified === false) {
      throw new Error('Your email is not verified. Please verify your email to unlock all features.');
    }

    if (!data.slots || data.slots.length === 0) {
      throw new Error('Please select at least one slot to proceed with booking.');
    }

    // RULE 1: SLOT CONFLICT PREVENTION (with database-level safety check)
    // Find slots matching criteria and make sure they are still available
    const requestedSlotIds = data.slots.map(sTime => `slot-${data.resourceId}-${data.date}-${parseInt((sTime || '09:00').split(':')[0])}`);
    
    // Check if any of these slot ids are currently 'booked', 'blocked', or 'held'
    const conflict = slots.some(s => requestedSlotIds.includes(s.id) && s.status !== 'available');
    if (conflict) {
      throw new Error('This slot was just taken! Please go back and select another time.');
    }

    const matchedRes = resources.find(r => r.id === data.resourceId);
    if (!matchedRes) throw new Error('Resource not found');

    const duration = data.slots.length;
    const baseAmount = matchedRes.price_per_hour * duration;
    
    // Offer math (Rule 7)
    let discount = 0;
    if (data.offerId) {
      const matchOff = offers.find(o => o.id === data.offerId);
      if (matchOff) {
        if (matchOff.discount_type === 'percentage') {
          discount = Math.floor((baseAmount * matchOff.discount_value) / 100);
          if (matchOff.max_discount_amount) {
            discount = Math.min(discount, matchOff.max_discount_amount);
          }
        } else {
          discount = matchOff.discount_value;
        }
      }
    }

    // Coins discount (1 coin = ₹1, max 50% value in coins)
    const availableCoins = currentUser.garf_coins;
    const coinsUsed = Math.min(data.coinsToUse, availableCoins);
    const coinsDiscount = coinsUsed;

    const netValueBeforeCoins = baseAmount - discount;
    const boundedCoinsDiscount = Math.min(coinsDiscount, Math.floor(netValueBeforeCoins * 0.5));
    const boundedCoinsUsed = boundedCoinsDiscount;

    const finalValue = Math.max(0, netValueBeforeCoins - boundedCoinsDiscount + platformFee);

    const bookingId = `book-${Math.random().toString(36).substr(2, 9)}`;
    const refCode = `GARF-${Math.floor(100000 + Math.random() * 900000)}`;

    const holdsExp = new Date(Date.now() + 5 * 60000).toISOString(); // Locked temporarily for 5 mins in check-out (Rule 1)

    // Setup held expires at or pay at venue hold expires at (Rule 2)
    let bStatus: Booking['booking_status'] = 'held';
    let payStatus: Booking['payment_status'] = 'pending';
    let holdExpAt: string | null = holdsExp;

    if (data.paymentMethod === 'pay_at_venue') {
      // RULE 4: No-shows block check
      const dbProfile = profiles.find(p => p.id === currentUser.id);
      const isBlocked = dbProfile?.pay_at_venue_blocked || currentUser.pay_at_venue_blocked || (dbProfile?.no_show_count || 0) >= 3 || (currentUser.no_show_count || 0) >= 3;
      if (isBlocked) {
        throw new Error('Pay-At-Venue Blocked: Your account has been permanently restricted from creating soft holds due to 3 or more no-shows.');
      }

      // RULE 4: Max 2 active soft holds
      const activeSoftHoldsCount = bookings.filter(b => 
        b.customer_id === currentUser.id && 
        b.booking_status === 'held' && 
        b.payment_method === 'pay_at_venue'
      ).length;
      if (activeSoftHoldsCount >= 2) {
        throw new Error('Limit reached: You can have a maximum of 2 active soft holds at any time.');
      }

      // RULE 1: Soft hold same-day within 2 hours check
      const now = new Date();
      const [hours, minutes] = data.slots[0].split(':').map(Number);
      const slotD = new Date(data.date);
      slotD.setHours(hours, minutes, 0, 0);

      const isSameDay = 
        now.getFullYear() === slotD.getFullYear() &&
        now.getMonth() === slotD.getMonth() &&
        now.getDate() === slotD.getDate();

      const diffMs = slotD.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (!isSameDay || diffHours < 0 || diffHours > 2) {
        throw new Error('Invalid Soft Hold: Pay-At-Venue (Soft Hold) is only available for same-day sessions starting within 2 hours of the slot time.');
      }

      // RULE 3: Timer starts AT slot time + 15 mins grace period
      const holdTimeLimit = new Date(slotD.getTime() + 15 * 60000); // slot start + 15 mins
      holdExpAt = holdTimeLimit.toISOString();
      bStatus = 'held';
      payStatus = 'pending';
    } else if (data.paymentMethod === 'token_advance') {
      holdExpAt = holdsExp;
      bStatus = 'held';
      payStatus = 'pending';
    }

    const newBooking: Booking = {
      id: bookingId,
      booking_ref: refCode,
      customer_id: currentUser.id,
      venue_id: data.venueId,
      resource_id: data.resourceId,
      booking_date: data.date,
      start_time: data.slots[0],
      end_time: data.slots[duration - 1].split(':').map((v, i) => i === 0 ? (parseInt(v) + 1).toString().padStart(2, '0') : v).join(':'),
      duration_hours: duration,
      base_amount: baseAmount,
      discount_amount: discount,
      coins_used: boundedCoinsUsed,
      coins_discount_amount: boundedCoinsDiscount,
      platform_fee: platformFee,
      final_amount: finalValue,
      payment_method: data.paymentMethod,
      payment_status: payStatus,
      booking_status: bStatus,
      hold_expires_at: holdExpAt,
      checked_in_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      refund_amount: 0,
      garf_coins_earned: 0, // only earnings set on completion or pay confirmed
      offer_id: data.offerId,
      walk_in_customer_name: null,
      walk_in_customer_phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Confirm Pay-at-Venue instantly locks the slots as held!
    if (data.paymentMethod === 'pay_at_venue') {
      // Create slots changes
      setSlots(prev => prev.map(s => {
        if (requestedSlotIds.includes(s.id)) {
          return {
            ...s,
            status: 'held' as const,
            booking_id: bookingId,
            held_until: holdExpAt,
            updated_at: new Date().toISOString()
          };
        }
        return s;
      }));

      addNotificationSilently(currentUser.id, 'Slot Held! ⏳', `Booking ${refCode} held. Arrive within 15 minutes of ${data.slots[0]} start time.`, 'booking');
      
      // Notify owner
      const venueOwner = venues.find(v => v.id === data.venueId);
      if (venueOwner) {
        addNotificationSilently(venueOwner.owner_id, 'New Pay-at-Venue Hold! 🔔', `Ref ${refCode} booked for ${matchedRes.name} on ${data.date} (${data.slots[0]}). Must check in by deadline.`, 'booking');
      }
    } else {
      // Online flow: locks standard checkout 5 min hold!
      setSlots(prev => prev.map(s => {
        if (requestedSlotIds.includes(s.id)) {
          return {
            ...s,
            status: 'held' as const,
            booking_id: bookingId,
            held_until: holdsExp,
            updated_at: new Date().toISOString()
          };
        }
        return s;
      }));
    }

    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  };

  const confirmOnlineBooking = async (bookingId: string, upiTransactionId?: string) => {
    let matchedB: Booking | undefined;
    let finalEarnings = 0; // Simplified requirements: no booking cashback earnings

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        finalEarnings = 0; // Simplified requirements: no booking cashback earnings
        const isToken = b.payment_method === 'token_advance';
        matchedB = {
          ...b,
          booking_status: 'confirmed' as const,
          payment_status: 'completed' as const,
          upi_transaction_id: upiTransactionId,
          garf_coins_earned: finalEarnings,
          hold_expires_at: null,
          advance_paid_amount: isToken ? Math.round(b.final_amount * 0.3) : undefined,
          updated_at: new Date().toISOString()
        };
        return matchedB;
      }
      return b;
    }));

    if (!matchedB) throw new Error('Booking not found');

    const finalB = matchedB;

    // Convert slot status from held/checkout to permanently booked
    setSlots(prev => prev.map(s => {
      if (s.booking_id === bookingId) {
        return {
          ...s,
          status: 'booked' as const,
          held_until: null,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));

    // Perform coins updates on profile (spend + earns in one action)
    setProfiles(prev => prev.map(p => {
      if (p.id === finalB.customer_id) {
        let afterCoins = p.garf_coins;
        
        // Spend
        if (finalB.coins_used > 0) {
          afterCoins -= finalB.coins_used;
          
          const txIdRed = `txn-red-${Math.random().toString(36).substr(2,9)}`;
          const txRed: CoinTransaction = {
            id: txIdRed,
            user_id: p.id,
            amount: -finalB.coins_used,
            type: 'redemption',
            description: `Deducted off booking ref ${finalB.booking_ref}`,
            reference_id: finalB.id,
            balance_after: afterCoins,
            created_at: new Date().toISOString()
          };
          setCoinTransactions(prevTx => [txRed, ...prevTx]);
        }

        // Earn
        afterCoins += finalEarnings;
        const txIdEarn = `txn-earn-${Math.random().toString(36).substr(2,9)}`;
        const txEarn: CoinTransaction = {
          id: txIdEarn,
          user_id: p.id,
          amount: finalEarnings,
          type: 'booking_earn',
          description: `10% Cashback earned on booking ${finalB.booking_ref}`,
          reference_id: finalB.id,
          balance_after: afterCoins,
          created_at: new Date().toISOString()
        };
        setCoinTransactions(prevTx => [txEarn, ...prevTx]);

        return {
          ...p,
          garf_coins: afterCoins
        };
      }
      return p;
    }));

    // Update currentUser if matched
    if (currentUser && currentUser.id === finalB.customer_id) {
      setCurrentUser(prev => {
        if (!prev) return null;
        let c = prev.garf_coins;
        if (finalB.coins_used > 0) c -= finalB.coins_used;
        c += finalEarnings;
        return { ...prev, garf_coins: c };
      });
    }

    addNotificationSilently(finalB.customer_id, 'Booking Confirmed! ✅', `Booking ${finalB.booking_ref} succeeded! You earned ${finalEarnings} GARF Coins!`, 'booking');

    // Notify venue owner
    const matchedV = venues.find(v => v.id === finalB.venue_id);
    if (matchedV) {
      addNotificationSilently(matchedV.owner_id, 'New Booking Confirmed 🎮', `Booking ref ${finalB.booking_ref} created for PC/Console. Check details!`, 'booking');
    }

    return finalB;
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    let finalB: Booking | undefined;
    const now = new Date();

    // 1. Fetch booking to calculate refund window
    bookings.forEach(b => {
      if (b.id === bookingId) finalB = b;
    });

    if (!finalB) throw new Error('Booking not found');

    // Calculation logic (Rule 4)
    // Booking date & start time -> calculate diff
    const bookingFullStart = new Date(`${finalB.booking_date}T${finalB.start_time}:00`);
    const diffMs = bookingFullStart.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    let refund = 0;
    let refundStatus: Booking['payment_status'] = 'completed';

    // Cancel slots (make available again)
    setSlots(prev => prev.map(s => {
      if (s.booking_id === bookingId) {
        return {
          ...s,
          status: 'available' as const,
          booking_id: null,
          held_until: null,
          updated_at: now.toISOString()
        };
      }
      return s;
    }));

    // RESTORE COINS (Rule 4)
    let coinsRestored = 0;
    let coinsDeductedBack = 0;

    if (finalB.payment_method === 'online' || finalB.payment_method === 'token_advance') {
      // Deduct back coins earned
      if (finalB.garf_coins_earned > 0) {
        coinsDeductedBack = finalB.garf_coins_earned;
      }
      // Restore coins used
      if (finalB.coins_used > 0) {
        coinsRestored = finalB.coins_used;
      }
    }

    // Update profiles coin balances
    const netCoinAdjustment = coinsRestored - coinsDeductedBack;
    
    setProfiles(prev => prev.map(p => {
      if (p.id === finalB!.customer_id) {
        let finalCoins = p.garf_coins;
        
        if (coinsDeductedBack > 0) {
          finalCoins -= coinsDeductedBack;
          const txIdDed = `txn-ded-${Math.random().toString(36).substr(2,9)}`;
          const txDed: CoinTransaction = {
            id: txIdDed,
            user_id: p.id,
            amount: -coinsDeductedBack,
            type: 'redemption', // or admin_adjust
            description: `Deducted cashback after cancelling ${finalB!.booking_ref}`,
            reference_id: finalB!.id,
            balance_after: finalCoins,
            created_at: new Date().toISOString()
          };
          setCoinTransactions(prevTx => [txDed, ...prevTx]);
        }

        if (coinsRestored > 0) {
          finalCoins += coinsRestored;
          const txIdRes = `txn-res-${Math.random().toString(36).substr(2,9)}`;
          const txRes: CoinTransaction = {
            id: txIdRes,
            user_id: p.id,
            amount: coinsRestored,
            type: 'cancellation_restore',
            description: `Coins restored after cancelling ${finalB!.booking_ref}`,
            reference_id: finalB!.id,
            balance_after: finalCoins,
            created_at: new Date().toISOString()
          };
          setCoinTransactions(prevTx => [txRes, ...prevTx]);
        }

        return { ...p, garf_coins: finalCoins };
      }
      return p;
    }));

    if (currentUser && currentUser.id === finalB.customer_id) {
      setCurrentUser(prev => prev ? { ...prev, garf_coins: prev.garf_coins + netCoinAdjustment } : null);
    }

    // Write cancellation output down in DB
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          booking_status: 'cancelled' as const,
          payment_status: refundStatus,
          refund_amount: refund,
          cancelled_at: now.toISOString(),
          cancellation_reason: reason,
          updated_at: now.toISOString()
        };
      }
      return b;
    }));

    addNotificationSilently(finalB.customer_id, 'Booking Cancelled ❌', `Your booking ${finalB.booking_ref} was cancelled and slot released. No refund is processed as per policy.`, 'booking');

    // Notify owner
    const matchedV = venues.find(v => v.id === finalB!.venue_id);
    if (matchedV) {
      addNotificationSilently(matchedV.owner_id, 'Booking Cancelled by Player ⏳', `Booking ref ${finalB.booking_ref} was cancelled by customer. Slot released.`, 'booking');
    }

    return { refund, coinsRestored };
  };

  // VENUE OPERATIONAL LOGICS
  const ownerCheckIn = (bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        // Also if check-in was Pay-At-Venue, flag it paid
        const isPayAtVenue = b.payment_method === 'pay_at_venue';
        
        // Calculate points earned for them now! (Rule 5) - Disabled as per simplified user requirements
        const earned = 0;

        // Update customer profile for coins earned
        if (false) {
          setProfiles(prevProfiles => prevProfiles.map(p => {
            if (p.id === b.customer_id) {
              const ball = p.garf_coins + earned;
              
              // Coin transaction
              const txIdEarn = `txn-earn-${Math.random().toString(36).substr(2,9)}`;
              const txEarn: CoinTransaction = {
                id: txIdEarn,
                user_id: p.id,
                amount: earned,
                type: 'booking_earn',
                description: `10% Cashback earned on booking ${b.booking_ref} (Pay at Venue)`,
                reference_id: b.id,
                balance_after: ball,
                created_at: new Date().toISOString()
              };
              setCoinTransactions(prevTx => [txEarn, ...prevTx]);

              return { ...p, garf_coins: ball };
            }
            return p;
          }));

          addNotificationSilently(b.customer_id, `Pay-at-Venue Complete! 🪙`, `Enjoy ${earned} Cashback coins for checking in at arena!`, 'coins');
        }

        addNotificationSilently(b.customer_id, 'Successfully Checked In! 🔵', `You are checked in for slot starting at ${b.start_time}. Have fun gaming!`, 'booking');

        // CRITICAL hook of nearby_checkins automatic spawn on validation of checkins (Rule 5)
        const checkinId = `check-${Math.random().toString(36).substr(2, 9)}`;
        const autoCheckin: NearbyCheckin = {
          id: checkinId,
          user_id: b.customer_id,
          venue_id: b.venue_id,
          booking_id: b.id,
          checked_in_at: new Date().toISOString(),
          checked_out_at: null,
          is_active: true,
          want_to_meet: true, // Default to true so people can find gamers
          created_at: new Date().toISOString()
        };
        setNearbyCheckins(prevCheckins => [...prevCheckins.filter(c => !(c.user_id === b.customer_id && c.is_active)), autoCheckin]);

        return {
          ...b,
          booking_status: 'checked_in' as const,
          payment_status: isPayAtVenue ? ('completed' as const) : b.payment_status,
          garf_coins_earned: isPayAtVenue ? earned : b.garf_coins_earned,
          checked_in_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return b;
    }));

    // Update associated slot records
    setSlots(prev => prev.map(s => {
      if (s.booking_id === bookingId) {
        return {
          ...s,
          status: 'booked' as const, // shift from held to booked
          held_until: null,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  const ownerExtendHold = (bookingId: string) => {
    // Adds +15 minutes to hold expiry (Rule 2)
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId && b.hold_expires_at) {
        const date = new Date(b.hold_expires_at);
        const newExp = new Date(date.getTime() + 15 * 60000).toISOString();
        
        // Also update slot timers
        setSlots(prevS => prevS.map(s => s.booking_id === bookingId ? { ...s, held_until: newExp, updated_at: new Date().toISOString() } : s));
        addNotificationSilently(b.customer_id, 'Slot Hold Extended! ⏰', 'The venue owner generously extended your pay-at-venue hold by 15 mins! Arrive ASAP.', 'booking');
        
        return {
          ...b,
          hold_expires_at: newExp,
          updated_at: new Date().toISOString()
        };
      }
      return b;
    }));
  };

  const ownerReleaseSlot = (bookingId: string) => {
    // Explicit manual release (Rule 2)
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        addNotificationSilently(b.customer_id, 'Slot Release Notice 🚫', 'Your pay-at-venue hold reservation was released by the venue manager.', 'booking');
        return {
          ...b,
          booking_status: 'cancelled' as const,
          cancellation_reason: 'Released by venue manager',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return b;
    }));

    // Turn matching slots back to available
    setSlots(prev => prev.map(s => {
      if (s.booking_id === bookingId) {
        return {
          ...s,
          status: 'available' as const,
          booking_id: null,
          held_until: null,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  const addWalkInBooking = (data: {
    resourceId: string, 
    date: string, 
    slots: string[], 
    customerName?: string, 
    customerPhone?: string, 
    pricePerHr?: number, 
    paymentBy: 'Cash' | 'UPI',
    actualStartTime?: string,
    actualEndTime?: string
  }) => {
    // Walk-In Booking (Rule 3)
    const duration = data.slots.length;
    const res = resources.find(r => r.id === data.resourceId);
    if (!res) throw new Error('Resource not found');

    const rate = data.pricePerHr !== undefined ? data.pricePerHr : res.price_per_hour;
    const amount = rate * duration;

    const bId = `book-walk-${Math.random().toString(36).substr(2, 9)}`;
    const bRef = `GARF-${Math.floor(100000 + Math.random() * 900000)}`;

    const newB: Booking = {
      id: bId,
      booking_ref: bRef,
      customer_id: 'user-walk-in-customer-anonymous',
      venue_id: res.venue_id,
      resource_id: res.id,
      booking_date: data.date,
      start_time: data.slots[0],
      end_time: data.slots[duration - 1].split(':').map((v, i) => i === 0 ? (parseInt(v) + 1).toString().padStart(2, '0') : v).join(':'),
      duration_hours: duration,
      base_amount: amount,
      discount_amount: 0,
      coins_used: 0,
      coins_discount_amount: 0,
      platform_fee: 0, // walk-in doesn't take online fee!
      final_amount: amount,
      payment_method: 'walk_in',
      payment_status: 'completed',
      booking_status: 'checked_in',
      hold_expires_at: null,
      checked_in_at: new Date().toISOString(),
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      refund_amount: 0,
      garf_coins_earned: 0,
      offer_id: null,
      walk_in_customer_name: data.customerName || 'Anonymous Walk-In',
      walk_in_customer_phone: data.customerPhone || null,
      walk_in_actual_start_time: data.actualStartTime || null,
      walk_in_actual_end_time: data.actualEndTime || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Instant lock slots
    const targetSlotIds = data.slots.map(s => `slot-${res.id}-${data.date}-${parseInt(s.split(':')[0])}`);
    setSlots(prev => prev.map(s => {
      if (targetSlotIds.includes(s.id)) {
        return {
          ...s,
          status: 'booked' as const,
          booking_id: bId,
          held_until: null,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));

    setBookings(prev => [...prev, newB]);
  };

  const ownerNoShow = (bookingId: string) => {
    let customerId = '';
    
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        customerId = b.customer_id;
        return { 
          ...b, 
          booking_status: 'no_show' as const, 
          updated_at: new Date().toISOString() 
        };
      }
      return b;
    }));
    
    setSlots(prev => prev.map(s => s.booking_id === bookingId ? { ...s, status: 'available', booking_id: null, held_until: null } : s));

    if (customerId && customerId !== 'user-walk-in-customer-anonymous') {
      setProfiles(prevProfiles => prevProfiles.map(p => {
        if (p.id === customerId) {
          const newCount = (p.no_show_count || 0) + 1;
          const blocked = newCount >= 3;
          
          if (blocked) {
            addNotificationSilently(
              p.id, 
              'Pay-at-Venue Blocked 🚫', 
              `Your Pay-at-Venue option is permanently blocked due to ${newCount} no-shows.`, 
              'system'
            );
          } else {
            addNotificationSilently(
              p.id, 
              'No-Show Warning ⚠️', 
              `No-Show logged (Total: ${newCount}/3). Soft-hold pays permanently block at 3 no-shows.`, 
              'system'
            );
          }

          const updatedP = { 
            ...p, 
            no_show_count: newCount,
            pay_at_venue_blocked: blocked
          };

          if (currentUser?.id === customerId) {
            setCurrentUser(updatedP);
          }
          
          return updatedP;
        }
        return p;
      }));
    }
  };

  const ownerCompleteBooking = (bookingId: string) => {
    setBookings(prev => {
      const active = prev.map(b => {
        if (b.id === bookingId) {
          // Process Referral logic if first completed booking (Rule 8) - No coins awarded as per simplified user requirements (start only)
          if (b.customer_id !== 'user-walk-in-customer-anonymous') {
            // Disabled referral coin credits to keep systems simple.
          }

          return {
            ...b,
            booking_status: 'completed' as const,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        return b;
      });
      return active;
    });

    // Checkout the nearby checkin (Rule 5 automatic checkout)
    setNearbyCheckins(prevCheckins => prevCheckins.map(c => {
      if (c.booking_id === bookingId && c.is_active) {
        return { ...c, is_active: false, checked_out_at: new Date().toISOString() };
      }
      return c;
    }));

    setSlots(prev => prev.map(s => s.booking_id === bookingId ? { ...s, status: 'available', booking_id: null, held_until: null, updated_at: new Date().toISOString() } : s));
  };

  const bulkBlockSlots = (resourceId: string, date: string, slotsList: string[], reason: string) => {
    const targetSlotIds = slotsList.map(s => `slot-${resourceId}-${date}-${parseInt(s.split(':')[0])}`);
    setSlots(prev => prev.map(s => {
      if (targetSlotIds.includes(s.id)) {
        return {
          ...s,
          status: 'blocked' as const,
          blocked_reason: reason,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  const bulkUnblockSlots = (resourceId: string, date: string, slotsList: string[]) => {
    const targetSlotIds = slotsList.map(s => `slot-${resourceId}-${date}-${parseInt(s.split(':')[0])}`);
    setSlots(prev => prev.map(s => {
      if (targetSlotIds.includes(s.id) && s.status === 'blocked') {
        return {
          ...s,
          status: 'available' as const,
          blocked_reason: null,
          updated_at: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  const registerDetailedVenue = async (
    venueData: Omit<Venue, 'id' | 'owner_id' | 'rating' | 'total_reviews' | 'is_verified' | 'is_active' | 'is_featured' | 'is_suspended'>,
    equipments: Array<Omit<GamingEquipment, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>,
    turfs: Array<Omit<TurfDetails, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required');

    const vId = `venue-${Math.random().toString(36).substr(2, 9)}`;
    const nowStr = new Date().toISOString();

    const newV: Venue = {
      ...venueData,
      id: vId,
      owner_id: currentUser.id,
      rating: 0,
      total_reviews: 0,
      is_verified: true,
      is_active: true,
      is_featured: false,
      is_suspended: false,
      commission_percent: 10,
      rejection_reason: null,
      verified_at: null,
      created_at: nowStr
    };

    const instantiatedEquipments: GamingEquipment[] = equipments.map((eq, idx) => ({
      ...eq,
      id: `equip-${vId}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      venue_id: vId,
      created_at: nowStr,
      updated_at: nowStr
    }));

    const instantiatedTurfs: TurfDetails[] = turfs.map((tf, idx) => ({
      ...tf,
      id: `turf-${vId}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      venue_id: vId,
      created_at: nowStr,
      updated_at: nowStr
    }));

    setVenues(prev => [...prev, newV]);
    
    if (instantiatedEquipments.length > 0) {
      setGamingEquipments(prev => [...prev, ...instantiatedEquipments]);
    }
    if (instantiatedTurfs.length > 0) {
      setTurfDetails(prev => [...prev, ...instantiatedTurfs]);
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
      await changeUserRole(currentUser.id, 'owner');
    }

    addNotificationSilently('user-admin-1', 'New venue submission 🏪', `New venue ${venueData.name} (${venueData.city}) has been submitted for verification.`, 'admin');

    return vId;
  };

  const addDetailedWalkIn = (walkInData: Omit<WalkInSession, 'id' | 'actual_end_at' | 'status' | 'created_at'>) => {
    const wsId = `walk-${Math.random().toString(36).substr(2, 9)}`;
    const nowStr = new Date().toISOString();
    
    const newSession: WalkInSession = {
      ...walkInData,
      id: wsId,
      status: 'active',
      actual_end_at: null,
      created_at: nowStr
    };

    if (walkInData.equipment_id) {
      setGamingEquipments(prev => prev.map(eq => {
        if (eq.id === walkInData.equipment_id) {
          const upEq = {
            ...eq,
            available_quantity: Math.max(0, eq.available_quantity - walkInData.quantity_used)
          };
          return upEq;
        }
        return eq;
      }));

      const eqSession: EquipmentSession = {
        id: `eq-sess-${Math.random().toString(36).substr(2, 9)}`,
        venue_id: walkInData.venue_id,
        equipment_id: walkInData.equipment_id,
        quantity_used: walkInData.quantity_used,
        session_type: 'walk_in',
        booking_id: null,
        walk_in_id: wsId,
        started_at: walkInData.started_at,
        expected_end_at: walkInData.expected_end_at,
        actual_end_at: null,
        status: 'active',
        created_at: nowStr
      };
      setEquipmentSessions(prev => [...prev, eqSession]);
    }

    const bookingId = `book-walk-${wsId}`;
    const bookingRef = `GARF-${Math.floor(100000 + Math.random() * 900000)}`;

    const startHrStr = new Date(walkInData.started_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).slice(0, 5);
    const endHrStr = new Date(walkInData.expected_end_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).slice(0, 5);

    const duration = walkInData.expected_duration_hours;
    
    const newB: Booking = {
      id: bookingId,
      booking_ref: bookingRef,
      customer_id: 'user-walk-in-customer-anonymous',
      venue_id: walkInData.venue_id,
      resource_id: walkInData.equipment_id || walkInData.turf_id || '',
      booking_date: walkInData.started_at.split('T')[0],
      start_time: startHrStr,
      end_time: endHrStr,
      duration_hours: duration,
      base_amount: walkInData.total_amount || 0,
      discount_amount: 0,
      coins_used: 0,
      coins_discount_amount: 0,
      platform_fee: 0,
      final_amount: walkInData.total_amount || 0,
      payment_method: 'walk_in',
      payment_status: 'completed',
      booking_status: 'checked_in',
      hold_expires_at: null,
      checked_in_at: nowStr,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      refund_amount: 0,
      garf_coins_earned: 0,
      offer_id: null,
      walk_in_customer_name: walkInData.customer_name || 'Anonymous Walk-In',
      walk_in_customer_phone: walkInData.customer_phone || null,
      created_at: nowStr,
      updated_at: nowStr,
      quantity: walkInData.quantity_used
    };

    const targetHoursArray: string[] = [];
    let startHourInt = parseInt(startHrStr.split(':')[0]) || 9;
    for (let hr = 0; hr < Math.ceil(duration); hr++) {
      targetHoursArray.push(`${(startHourInt + hr).toString().padStart(2, '0')}:00`);
    }

    const tId = walkInData.equipment_id || walkInData.turf_id || '';
    const dateStr = walkInData.started_at.split('T')[0];
    const targetSlotIds = targetHoursArray.map(h => `slot-${tId}-${dateStr}-${parseInt(h.split(':')[0])}`);

    setSlots(prev => prev.map(s => {
      if (targetSlotIds.includes(s.id)) {
        return {
          ...s,
          status: 'booked' as const,
          booking_id: bookingId,
          held_until: null,
          updated_at: nowStr
        };
      }
      return s;
    }));

    setBookings(prev => [...prev, newB]);
    setWalkInSessions(prev => [...prev, newSession]);
  };

  const endDetailedWalkIn = (walkInId: string, customAmountCollected: number, paymentType: 'cash' | 'upi') => {
    const nowStr = new Date().toISOString();
    
    setWalkInSessions(prev => prev.map(ws => {
      if (ws.id === walkInId) {
        if (ws.equipment_id) {
          setGamingEquipments(eqs => eqs.map(eq => {
            if (eq.id === ws.equipment_id) {
              return {
                ...eq,
                available_quantity: Math.min(eq.total_quantity, eq.available_quantity + ws.quantity_used)
              };
            }
            return eq;
          }));

          setEquipmentSessions(eqSess => eqSess.map(es => {
            if (es.walk_in_id === walkInId) {
              return {
                ...es,
                status: 'completed',
                actual_end_at: nowStr
              };
            }
            return es;
          }));
        }

        return {
          ...ws,
          status: 'completed',
          actual_end_at: nowStr,
          total_amount: customAmountCollected,
          payment_type: paymentType
        };
      }
      return ws;
    }));

    const bId = `book-walk-${walkInId}`;
    setBookings(prev => prev.map(b => {
      if (b.id === bId) {
        return {
          ...b,
          booking_status: 'completed',
          payment_status: 'completed',
          completed_at: nowStr,
          base_amount: customAmountCollected,
          final_amount: customAmountCollected,
          updated_at: nowStr
        };
      }
      return b;
    }));

    setSlots(prev => prev.map(s => {
      if (s.booking_id === bId) {
        return {
          ...s,
          status: 'available',
          booking_id: null,
          updated_at: nowStr
        };
      }
      return s;
    }));
  };

  const generateSlotsForNext7Days = (resourceId: string) => {
    const res = resources.find(r => r.id === resourceId);
    if (!res) return;

    const v = venues.find(venue => venue.id === res.venue_id);
    if (!v) return;

    const sHour = parseInt((v.operating_hours_start || '09:00').split(':')[0]) || 9;
    const eHour = parseInt((v.operating_hours_end || '23:00').split(':')[0]) || 23;

    const allSlots = [...slots];
    for (let i = 0; i < 8; i++) {
      const dateStr = getOffsetDateString(i);
      const exist = allSlots.some(s => s.resource_id === resourceId && s.slot_date === dateStr);
      if (!exist) {
        for (let hr = sHour; hr < eHour; hr++) {
          const startStr = `${hr.toString().padStart(2, '0')}:00`;
          const endStr = `${(hr + 1).toString().padStart(2, '0')}:00`;

          allSlots.push({
            id: `slot-${resourceId}-${dateStr}-${hr}`,
            venue_id: res.venue_id,
            resource_id: resourceId,
            slot_date: dateStr,
            start_time: startStr,
            end_time: endStr,
            status: 'available',
            booking_id: null,
            held_until: null,
            blocked_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    setSlots(allSlots);
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => n.user_id === currentUser.id ? { ...n, is_read: true } : n));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  // REVIEWS SUBMISSION
  const submitReview = (bookingId: string, rating: number, comment: string) => {
    if (!currentUser) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const revId = `rev-${Math.random().toString(36).substr(2, 9)}`;
    const newRev: Review = {
      id: revId,
      booking_id: bookingId,
      customer_id: currentUser.id,
      venue_id: booking.venue_id,
      rating,
      comment,
      owner_reply: null,
      owner_replied_at: null,
      created_at: new Date().toISOString().split('T')[0]
    };

    setReviews(prev => [newRev, ...prev]);

    // Update venue rating & counts (Rule 6)
    setVenues(prev => prev.map(v => {
      if (v.id === booking.venue_id) {
        const oldAvg = v.rating;
        const oldCount = v.total_reviews;
        const newTotal = oldCount + 1;
        const newAvg = parseFloat(((oldAvg * oldCount + rating) / newTotal).toFixed(1));
        return {
          ...v,
          rating: newAvg,
          total_reviews: newTotal
        };
      }
      return v;
    }));

    // No coins awarded for review as per simplified user requirements (start only).
  };

  // ==========================================
  // Admin dashboard customization actions
  // ==========================================
  const updateUserRole = (userId: string, newRole: 'customer' | 'owner' | 'admin') => {
    changeUserRole(userId, newRole);
  };

  const toggleUserSuspension = (userId: string) => {
    const user = profiles.find(p => p.id === userId);
    if (!user) return;
    if (user.is_suspended) {
      reactivateUser(userId);
    } else {
      suspendUser(userId, 'Administrative intervention');
    }
  };

  const toggleVenueVerification = (venueId: string) => {
    const v = venues.find(ven => ven.id === venueId);
    if (!v) return;
    if (v.is_verified) {
      updateVenue(venueId, { is_verified: false, is_active: false });
    } else {
      verifyVenue(venueId);
    }
  };

  const toggleVenueActiveState = (venueId: string) => {
    const v = venues.find(ven => ven.id === venueId);
    if (!v) return;
    updateVenue(venueId, { is_active: !v.is_active });
  };

  // ==========================================
  // GARF SQUAD Social layer actions
  // ==========================================
  const createSquadProfile = (data: { username: string; gamer_tag: string | null; bio: string | null; favorite_games: string[]; favorite_sports: string[]; preferred_city: string }) => {
    if (!currentUser) throw new Error('Not logged in');
    if (currentUser.emailVerified === false) {
      throw new Error('Your email is not verified. Please verify your email to unlock all features.');
    }
    const cleanedUsername = data.username.replace(/\s+/g, '_').toLowerCase();
    const existing = squadProfiles.find(p => p.username.toLowerCase() === cleanedUsername.toLowerCase());
    if (existing && existing.id !== currentUser.id) {
      throw new Error('Username already taken! Choose a different one.');
    }
    const newProf: GarfSquadProfile = {
      id: currentUser.id,
      username: cleanedUsername,
      gamer_tag: data.gamer_tag,
      bio: data.bio,
      favorite_games: data.favorite_games,
      favorite_sports: data.favorite_sports,
      preferred_city: data.preferred_city,
      is_online: true,
      last_seen: new Date().toISOString(),
      total_squads_joined: 0,
      is_profile_public: true,
      created_at: new Date().toISOString()
    };
    setSquadProfiles(prev => {
      const filtered = prev.filter(p => p.id !== currentUser.id);
      return [...filtered, newProf];
    });

    // No extra coin bonus on squad setup as per simplified user requirements (start only).
    return newProf;
  };

  const updateSquadProfile = (data: Partial<GarfSquadProfile>) => {
    if (!currentUser) throw new Error('Not logged in');
    setSquadProfiles(prev => prev.map(p => {
      if (p.id === currentUser.id) {
        return { ...p, ...data } as GarfSquadProfile;
      }
      return p;
    }));
  };

  const createSquad = (data: { name: string; description: string | null; type: Squad['type']; city: string; game_or_sport: string | null; max_members: number; is_private: boolean; venue_id: string | null; cover_image: string | null }) => {
    if (!currentUser) throw new Error('Not logged in');
    if (currentUser.emailVerified === false) {
      throw new Error('Your email is not verified. Please verify your email to unlock all features.');
    }
    const newId = `squad-${Math.random().toString(36).substr(2, 9)}`;
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newS: Squad = {
      id: newId,
      name: data.name,
      description: data.description,
      type: data.type,
      squad_code: code,
      cover_image: data.cover_image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150',
      city: data.city,
      game_or_sport: data.game_or_sport,
      max_members: data.max_members,
      is_private: data.is_private,
      created_by: currentUser.id,
      venue_id: data.venue_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSquads(prev => [...prev, newS]);

    // Add creator as Admin
    const newM: SquadMember = {
      id: `sm-${Math.random().toString(36).substr(2, 9)}`,
      squad_id: newId,
      user_id: currentUser.id,
      role: 'admin',
      status: 'active',
      invited_by: null,
      joined_at: new Date().toISOString(),
      invited_at: null,
      created_at: new Date().toISOString()
    };
    setSquadMembers(prev => [...prev, newM]);

    sendMessage({
      type: 'squad',
      squad_id: newId,
      receiver_id: null,
      city: null,
      content: `Squad spawned! Share code: ${code}`,
      message_type: 'text'
    });

    return newS;
  };

  const joinSquadWithCode = async (code: string) => {
    if (!currentUser) throw new Error('Not logged in');
    if (currentUser.emailVerified === false) {
      throw new Error('Your email is not verified. Please verify your email to unlock all features.');
    }
    const sq = squads.find(s => s.squad_code.toUpperCase() === code.toUpperCase().trim());
    if (!sq) throw new Error('No SQUAD found matching invitation code.');

    const existing = squadMembers.find(m => m.squad_id === sq.id && m.user_id === currentUser.id);
    if (existing) {
      if (existing.status === 'active') throw new Error('You are already an active member of this squad.');
      if (existing.status === 'requested') throw new Error('Your request is already pending approval.');
    }

    const isInviteOnly = sq.is_private;
    const newM: SquadMember = {
      id: `sm-${Math.random().toString(36).substr(2, 9)}`,
      squad_id: sq.id,
      user_id: currentUser.id,
      role: 'member',
      status: isInviteOnly ? 'requested' : 'active',
      invited_by: null,
      joined_at: isInviteOnly ? null : new Date().toISOString(),
      invited_at: null,
      created_at: new Date().toISOString()
    };
    setSquadMembers(prev => [...prev, newM]);

    if (!isInviteOnly) {
      sendMessage({
        type: 'squad',
        squad_id: sq.id,
        receiver_id: null,
        city: null,
        content: `"${currentUser.full_name}" joined the room.`,
        message_type: 'text'
      });
      addNotificationSilently(sq.created_by, 'New squad comrade!', `${currentUser.full_name} entered squad ${sq.name}`, 'booking');
    } else {
      addNotificationSilently(sq.created_by, 'Squad Request Pending', `${currentUser.full_name} wants to join squad ${sq.name}`, 'booking');
    }

    return sq;
  };

  const joinPublicSquad = (squadId: string) => {
    if (!currentUser) return;
    if (currentUser.emailVerified === false) {
      throw new Error('Your email is not verified. Please verify your email to unlock all features.');
    }
    const sq = squads.find(s => s.id === squadId);
    if (!sq || sq.is_private) return;

    const existing = squadMembers.find(m => m.squad_id === squadId && m.user_id === currentUser.id);
    if (existing && existing.status === 'active') return;

    const newM: SquadMember = {
      id: `sm-${Math.random().toString(36).substr(2, 9)}`,
      squad_id: squadId,
      user_id: currentUser.id,
      role: 'member',
      status: 'active',
      invited_by: null,
      joined_at: new Date().toISOString(),
      invited_at: null,
      created_at: new Date().toISOString()
    };
    setSquadMembers(prev => {
      const filtered = prev.filter(m => !(m.squad_id === squadId && m.user_id === currentUser.id));
      return [...filtered, newM];
    });

    sendMessage({
      type: 'squad',
      squad_id: squadId,
      receiver_id: null,
      city: null,
      content: `"${currentUser.full_name}" entered the lobby.`,
      message_type: 'text'
    });
  };

  const leaveSquad = (squadId: string) => {
    if (!currentUser) return;
    setSquadMembers(prev => prev.filter(m => !(m.squad_id === squadId && m.user_id === currentUser.id)));
    sendMessage({
      type: 'squad',
      squad_id: squadId,
      receiver_id: null,
      city: null,
      content: `"${currentUser.full_name}" checked out of squad.`,
      message_type: 'text'
    });
  };

  const acceptSquadJoinRequest = (memberRecordId: string) => {
    setSquadMembers(prev => prev.map(m => {
      if (m.id === memberRecordId) {
        const sq = squads.find(s => s.id === m.squad_id);
        addNotificationSilently(m.user_id, 'Squad Join Approved! 🛡️', `Your request to join ${sq ? sq.name : 'the SQUAD'} was approved!`, 'booking');
        return { ...m, status: 'active', joined_at: new Date().toISOString() };
      }
      return m;
    }));
  };

  const declineSquadJoinRequest = (memberRecordId: string) => {
    setSquadMembers(prev => prev.filter(m => m.id !== memberRecordId));
  };

  const editSquad = (squadId: string, data: Partial<Squad>) => {
    setSquads(prev => prev.map(s => s.id === squadId ? { ...s, ...data, updated_at: new Date().toISOString() } : s));
  };

  const deleteSquad = (squadId: string) => {
    setSquads(prev => prev.filter(s => s.id !== squadId));
    setSquadMembers(prev => prev.filter(m => m.squad_id !== squadId));
  };

  const sendMessage = (data: { type: Message['type']; squad_id: string | null; receiver_id: string | null; city: string | null; content: string | null; message_type: Message['message_type']; poll_id?: string | null; booking_id?: string | null; player_needed_id?: string | null }) => {
    const sender = currentUser ? currentUser.id : 'user-walk-in-customer-anonymous';
    const newMsg: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      sender_id: sender,
      squad_id: data.squad_id,
      receiver_id: data.receiver_id,
      city: data.city,
      content: data.content,
      message_type: data.message_type,
      poll_id: data.poll_id || null,
      booking_id: data.booking_id || null,
      player_needed_id: data.player_needed_id || null,
      is_deleted: false,
      is_edited: false,
      edited_at: null,
      reply_to_id: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMsg]);

    if (data.type === 'direct' && data.receiver_id && currentUser) {
      setDmThreads(prev => {
        let thread = prev.find(t => (t.user1_id === currentUser.id && t.user2_id === data.receiver_id) || (t.user1_id === data.receiver_id && t.user2_id === currentUser.id));
        const previewText = data.message_type === 'text' ? (data.content || '') : `[${data.message_type}] message`;
        if (thread) {
          return prev.map(t => {
            if (t.id === thread!.id) {
              return {
                ...t,
                last_message_at: new Date().toISOString(),
                last_message_preview: previewText.substring(0, 40),
                user1_unread_count: t.user1_id === currentUser.id ? t.user1_unread_count : t.user1_unread_count + 1,
                user2_unread_count: t.user2_id === currentUser.id ? t.user2_unread_count : t.user2_unread_count + 1
              };
            }
            return t;
          });
        } else {
          const newThread: DirectMessageThread = {
            id: `thread-${Math.random().toString(36).substr(2, 9)}`,
            user1_id: currentUser.id,
            user2_id: data.receiver_id,
            last_message_at: new Date().toISOString(),
            last_message_preview: previewText.substring(0, 40),
            user1_unread_count: 0,
            user2_unread_count: 1,
            created_at: new Date().toISOString()
          };
          return [...prev, newThread];
        }
      });
    }

    return newMsg;
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m));
  };

  const replyToMessage = (replyToId: string, contentStr: string) => {
    if (!currentUser) throw new Error('Not logged in');
    const original = messages.find(m => m.id === replyToId);
    if (!original) throw new Error('Original message not found');

    const reply: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      type: original.type,
      sender_id: currentUser.id,
      squad_id: original.squad_id,
      receiver_id: original.receiver_id,
      city: original.city,
      content: contentStr,
      message_type: 'text',
      poll_id: null,
      booking_id: null,
      player_needed_id: null,
      is_deleted: false,
      is_edited: false,
      edited_at: null,
      reply_to_id: replyToId,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, reply]);
    return reply;
  };

  const createPoll = (data: { question: string; options: string[]; expires_at: string; allow_multiple_choice: boolean; squad_id: string | null; city: string | null }) => {
    if (!currentUser) throw new Error('Not logged in');
    const pollId = `poll-${Math.random().toString(36).substr(2, 9)}`;
    const newP: Poll = {
      id: pollId,
      created_by: currentUser.id,
      squad_id: data.squad_id,
      city: data.city,
      question: data.question,
      options: data.options,
      expires_at: data.expires_at,
      allow_multiple_choice: data.allow_multiple_choice,
      is_closed: false,
      total_votes: 0,
      created_at: new Date().toISOString()
    };
    setPolls(prev => [...prev, newP]);

    sendMessage({
      type: data.squad_id ? 'squad' : 'global_city',
      squad_id: data.squad_id,
      receiver_id: null,
      city: data.city,
      content: `[New poll: "${data.question}"]`,
      message_type: 'poll',
      poll_id: pollId
    });

    return newP;
  };

  const voteInPoll = (pollId: string, selectedOptions: number[]) => {
    if (!currentUser) return;
    const existing = pollVotes.find(v => v.poll_id === pollId && v.user_id === currentUser.id);

    if (existing) {
      setPollVotes(prev => prev.map(v => {
        if (v.poll_id === pollId && v.user_id === currentUser.id) {
          return { ...v, selected_options: selectedOptions };
        }
        return v;
      }));
    } else {
      const newVote: PollVote = {
        id: `vote-${Math.random().toString(36).substr(2, 9)}`,
        poll_id: pollId,
        user_id: currentUser.id,
        selected_options: selectedOptions,
        created_at: new Date().toISOString()
      };
      setPollVotes(prev => [...prev, newVote]);
    }

    setPolls(prev => prev.map(p => {
      if (p.id === pollId) {
        const diff = existing ? 0 : 1;
        return { ...p, total_votes: p.total_votes + diff };
      }
      return p;
    }));
  };

  const createPlayerNeededPost = (data: { city: string; venue_id: string | null; title: string; description: string | null; game_or_sport: string; players_needed: number; booking_date: string | null; booking_time: string | null; venue_booked: boolean; expires_at: string; share_in_global?: boolean; share_in_squads?: boolean }) => {
    if (!currentUser) throw new Error('Not logged in');
    const newId = `post-${Math.random().toString(36).substr(2, 9)}`;
    const newP: PlayerNeededPost = {
      id: newId,
      posted_by: currentUser.id,
      city: data.city,
      venue_id: data.venue_id,
      title: data.title,
      description: data.description,
      game_or_sport: data.game_or_sport,
      players_needed: data.players_needed,
      players_joined: 0,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      venue_booked: data.venue_booked,
      status: 'open',
      expires_at: data.expires_at,
      created_at: new Date().toISOString()
    };
    setPlayerNeededPosts(prev => [...prev, newP]);

    if (data.share_in_global) {
      sendMessage({
        type: 'global_city',
        squad_id: null,
        receiver_id: null,
        city: data.city,
        content: `⚔️ Match host: "${data.title}" at your city! Join up.`,
        message_type: 'player_needed',
        player_needed_id: newId
      });
    }

    if (data.share_in_squads) {
      const mySquadIds = squadMembers.filter(m => m.user_id === currentUser.id && m.status === 'active').map(m => m.squad_id);
      mySquadIds.forEach(sqId => {
        sendMessage({
          type: 'squad',
          squad_id: sqId,
          receiver_id: null,
          city: null,
          content: `⚔️ Squad Match lobby: "${data.title}"`,
          message_type: 'player_needed',
          player_needed_id: newId
        });
      });
    }

    return newP;
  };

  const requestToJoinPlayerNeeded = (postId: string, message: string | null) => {
    if (!currentUser) return;
    const post = playerNeededPosts.find(p => p.id === postId);
    if (!post) return;

    const newRes: PlayerNeededResponse = {
      id: `res-${Math.random().toString(36).substr(2, 9)}`,
      post_id: postId,
      responder_id: currentUser.id,
      message,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setPlayerNeededResponses(prev => [...prev, newRes]);
    addNotificationSilently(post.posted_by, 'Comrade wants to play! ⚔️', `${currentUser.full_name} requested to join "${post.title}"`, 'booking');
  };

  const respondToPlayerNeededJoin = (responseId: string, status: 'accepted' | 'rejected') => {
    setPlayerNeededResponses(prev => prev.map(r => {
      if (r.id === responseId) {
        const post = playerNeededPosts.find(p => p.id === r.post_id);
        if (post) {
          if (status === 'accepted') {
            setPlayerNeededPosts(prevPost => prevPost.map(p => {
              if (p.id === post.id) {
                const joined = p.players_joined + 1;
                const activeStatus = joined >= p.players_needed ? ('filled' as const) : ('open' as const);
                return { ...p, players_joined: joined, status: activeStatus };
              }
              return p;
            }));
            addNotificationSilently(r.responder_id, 'Arena Team slots APPROVED! ⚽', `Host approved your slot request for "${post.title}"!`, 'booking');
          } else {
            addNotificationSilently(r.responder_id, 'Arena team slot declined', `Host declined your slot request for "${post.title}"`, 'booking');
          }
        }
        return { ...r, status };
      }
      return r;
    }));
  };

  const managePlayerNeededPost = (postId: string, action: 'fill' | 'cancel') => {
    setPlayerNeededPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, status: action === 'fill' ? ('filled' as const) : ('cancelled' as const) };
      }
      return p;
    }));
  };

  const sendSquadInvite = (squadId: string, invitedUserId: string, message: string | null) => {
    if (!currentUser) return;
    const invId = `inv-${Math.random().toString(36).substr(2, 9)}`;
    const newInv: SquadInvite = {
      id: invId,
      squad_id: squadId,
      invited_by: currentUser.id,
      invited_user_id: invitedUserId,
      message,
      status: 'pending',
      expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      created_at: new Date().toISOString()
    };
    setSquadInvites(prev => [...prev, newInv]);

    const sq = squads.find(s => s.id === squadId);
    addNotificationSilently(invitedUserId, 'SQUAD recruitment invitation! 🛡', `${currentUser.full_name} invited you to join "${sq ? sq.name : 'comrades'}"`, 'booking');

    sendMessage({
      type: 'direct',
      squad_id: null,
      receiver_id: invitedUserId,
      city: null,
      content: `I invited you to join my Squad! Check invitations on the Squad dashboard.`,
      message_type: 'squad_invite'
    });
  };

  const respondToSquadInvite = (inviteId: string, status: 'accepted' | 'declined') => {
    setSquadInvites(prev => prev.map(inv => {
      if (inv.id === inviteId) {
        if (status === 'accepted') {
          const newM: SquadMember = {
            id: `sm-${Math.random().toString(36).substr(2, 9)}`,
            squad_id: inv.squad_id,
            user_id: inv.invited_user_id,
            role: 'member',
            status: 'active',
            invited_by: inv.invited_by,
            joined_at: new Date().toISOString(),
            invited_at: inv.created_at,
            created_at: new Date().toISOString()
          };
          setSquadMembers(prevM => [...prevM, newM]);

          const sq = squads.find(s => s.id === inv.squad_id);
          addNotificationSilently(inv.invited_by, 'Recruit accepted! 🎉', `Your squad recruit invite was accepted by comrade!`, 'booking');
        }
        return { ...inv, status };
      }
      return inv;
    }));
  };

  const createSquadEvent = (data: { squad_id: string; title: string; event_date: string; event_time: string; venue_id: string | null; game_or_sport: string; max_participants: number; notes: string | null }) => {
    if (!currentUser) throw new Error('Not logged in');
    const newId = `evt-${Math.random().toString(36).substr(2, 9)}`;
    const newE: SquadEvent = {
      id: newId,
      squad_id: data.squad_id,
      created_by: currentUser.id,
      title: data.title,
      event_date: data.event_date,
      event_time: data.event_time,
      venue_id: data.venue_id,
      game_or_sport: data.game_or_sport,
      max_participants: data.max_participants,
      notes: data.notes,
      participants: { [currentUser.id]: 'going' },
      created_at: new Date().toISOString()
    };
    setSquadEvents(prev => [...prev, newE]);

    sendMessage({
      type: 'squad',
      squad_id: data.squad_id,
      receiver_id: null,
      city: null,
      content: `📅 Spawned Squad Event: "${data.title}" on ${data.event_date} at ${data.event_time}`,
      message_type: 'text'
    });

    return newE;
  };

  const rsvpToSquadEvent = (eventId: string, rsvp: 'going' | 'maybe' | 'not_going') => {
    if (!currentUser) return;
    setSquadEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          participants: {
            ...e.participants,
            [currentUser.id]: rsvp
          }
        };
      }
      return e;
    }));
  };

  const updateNearbyCheckinMeetStatus = (status: boolean) => {
    if (!currentUser) return;
    setNearbyCheckins(prev => prev.map(c => {
      if (c.user_id === currentUser.id && c.is_active) {
        return { ...c, want_to_meet: status };
      }
      return c;
    }));
  };

  const checkoutNearbyCheckin = () => {
    if (!currentUser) return;
    setNearbyCheckins(prev => prev.map(c => {
      if (c.user_id === currentUser.id && c.is_active) {
        return { ...c, is_active: false, checked_out_at: new Date().toISOString() };
      }
      return c;
    }));
  };

  const generateSecureToken = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  };

  const verifyEmailToken = async (token: string): Promise<{ success: boolean; message: string }> => {
    const matchedProfile = profiles.find(p => p.verificationToken === token);
    if (!matchedProfile) {
      return { success: false, message: 'Invalid or already verified token.' };
    }

    const expiresAt = matchedProfile.verificationTokenExpires;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { success: false, message: 'This verification link has expired. Please request a new verification email.' };
    }

    // Update profiles
    const updated = profiles.map(p => {
      if (p.id === matchedProfile.id) {
        return {
          ...p,
          emailVerified: true,
          verificationToken: undefined,
          verificationTokenExpires: undefined,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });

    setProfiles(updated);

    // Update currentUser if it matches
    if (currentUser && currentUser.id === matchedProfile.id) {
      setCurrentUser({
        ...currentUser,
        emailVerified: true,
        verificationToken: undefined,
        verificationTokenExpires: undefined,
        updated_at: new Date().toISOString()
      });
    }

    return { success: true, message: 'Your email address has been verified successfully! 🎉' };
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string; token: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const matchedProfile = profiles.find(p => p.email?.toLowerCase().trim() === cleanEmail);
    if (!matchedProfile) {
      throw new Error('No user account found with this email address.');
    }

    if (matchedProfile.emailVerified) {
      throw new Error('This email address is already verified.');
    }

    const newToken = generateSecureToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const updated = profiles.map(p => {
      if (p.id === matchedProfile.id) {
        return {
          ...p,
          verificationToken: newToken,
          verificationTokenExpires: expires,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });

    setProfiles(updated);

    if (currentUser && currentUser.id === matchedProfile.id) {
      setCurrentUser({
        ...currentUser,
        verificationToken: newToken,
        verificationTokenExpires: expires,
        updated_at: new Date().toISOString()
      });
    }

    // Simulate sending email via internal notifications & a console.log / alert mock
    const verifyLink = `${window.location.origin}/explore?verifyToken=${newToken}`;
    addNotificationSilently(
      matchedProfile.id,
      'Email Verification Link ✉️',
      `Use this secure link to verify your email (expires in 24 hours): ${verifyLink}`,
      'system'
    );

    console.log(`[SIMULATED EMAIL SENT TO ${cleanEmail}] Verification link: ${verifyLink}`);

    return { 
      success: true, 
      message: `A secure verification link has been dispatched to ${email}!`,
      token: newToken
    };
  };

  return (
    <AppContext.Provider value={{
      profiles, venues, resources, slots, bookings, reviews, coinTransactions, offers, notifications, adminLogs, currentUser,
      signUp, logIn, logOut, logoutUser: logOut, updateProfile, deleteAccount, verifyEmailToken, resendVerificationEmail,
      registerVenue, registerDetailedVenue, updateVenue, deleteVenue, addResource, updateResource, deleteResource, createOffer, deactivateOffer, replyToReview,
      verifyVenue, rejectVenue, toggleFeatureVenue, suspendVenue, reactivateVenue, changeUserRole, suspendUser, reactivateUser, adjustUserCoins, updatePlatformSettings,
      createBookingHold, confirmOnlineBooking, cancelBooking,
      ownerCheckIn, ownerExtendHold, ownerReleaseSlot, addWalkInBooking, ownerNoShow, ownerCompleteBooking, bulkBlockSlots, bulkUnblockSlots, generateSlotsForNext7Days,
      addVenue: registerVenue, checkInBooking: ownerCheckIn, markNoShowBooking: ownerNoShow,
      markAllNotificationsRead, markNotificationRead, submitReview,
      commissionPercent, platformFee, setPlatformFee,
      welcomeBonusCoins, setWelcomeBonusCoins, birthdayBonusCoins, setBirthdayBonusCoins,
      updateUserRole, toggleUserSuspension, toggleVenueVerification, toggleVenueActiveState,

      // New Operational States and Actions
      gamingEquipments, setGamingEquipments,
      turfDetails, setTurfDetails,
      equipmentSessions, setEquipmentSessions,
      walkInSessions, setWalkInSessions,
      turfBookings, setTurfBookings,
      addDetailedWalkIn, endDetailedWalkIn,

      // Garf Squad States
      squadProfiles, squads, squadMembers, messages, polls, pollVotes, playerNeededPosts, playerNeededResponses, dmThreads, nearbyCheckins, squadInvites, squadEvents,

      // Garf Squad Actions
      createSquadProfile, updateSquadProfile, createSquad, joinSquadWithCode, joinPublicSquad, leaveSquad, acceptSquadJoinRequest, declineSquadJoinRequest, editSquad, deleteSquad, sendMessage, deleteMessage, replyToMessage, createPoll, voteInPoll, createPlayerNeededPost, requestToJoinPlayerNeeded, respondToPlayerNeededJoin, managePlayerNeededPost, sendSquadInvite, respondToSquadInvite, createSquadEvent, rsvpToSquadEvent, updateNearbyCheckinMeetStatus, checkoutNearbyCheckin,

      // Geolocation city detection
      detectedCity, isDetectingCity, detectUserCity
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
