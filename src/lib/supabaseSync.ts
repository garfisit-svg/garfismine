/**
 * GARF Supabase Real-Time Sync Service
 * 
 * This service shows how easy it is to fetch and subscribe to real-time events
 * from Supabase, connecting live changes to your local state.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { Message, Slot, Booking, Notification } from '../types';

export const SupabaseSyncService = {
  /**
   * 1. Live Chat Subscription (Global, Squad, or Direct messages)
   */
  subscribeToMessages(
    callback: (newMessage: Message) => void
  ) {
    if (!isSupabaseConfigured || !supabase) return null;

    return supabase
      .channel('live-chats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },

  /**
   * 2. Live Slot Lock updates (Hard locks and Soft holds)
   */
  subscribeToSlots(
    callback: (updatedSlot: Slot) => void
  ) {
    if (!isSupabaseConfigured || !supabase) return null;

    return supabase
      .channel('live-slots')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'slots' },
        (payload) => {
          callback(payload.new as Slot);
        }
      )
      .subscribe();
  },

  /**
   * 3. Live Notification trigger
   */
  subscribeToNotifications(
    userId: string,
    callback: (newNotification: Notification) => void
  ) {
    if (!isSupabaseConfigured || !supabase) return null;

    return supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}` 
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  },

  /**
   * 4. Safe Fetching utility examples
   */
  async fetchLiveBookings(): Promise<Booking[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching live bookings:', error.message);
      return [];
    }
    return data as Booking[];
  }
};
