import { Booking, Slot, VenueResource } from '../types';

/**
 * Converts a time string "HH:MM" or datetime string to minutes from midnight (0..1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Handle ISO string or date string if passed
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }

  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:MM" 24-hour string.
 */
export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, minutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Adds minute offset to a "HH:MM" string.
 */
export function addMinutesToTime(timeStr: string, addMins: number): string {
  const current = timeToMinutes(timeStr);
  return minutesToTime(current + addMins);
}

/**
 * Formats "HH:MM" or datetime to 12-hour AM/PM string, e.g. "11:15 AM".
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const totalMins = timeToMinutes(timeStr);
  const h24 = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Core Overlap Formula:
 * Two time intervals [A_start, A_end] and [B_start, B_end] overlap if and only if:
 * A_start < B_end AND A_end > B_start
 */
export function doIntervalsOverlap(
  startA: string, 
  endA: string, 
  startB: string, 
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && aEnd > bStart;
}

/**
 * Normalizes effective start and end times for a booking.
 * Respects walk-in exact start/end times and early completions.
 */
export function getEffectiveBookingTimes(booking: Booking): {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
} {
  // Cancelled or no-show bookings do not occupy the unit
  if (booking.booking_status === 'cancelled' || booking.booking_status === 'no_show') {
    return {
      startTime: booking.start_time,
      endTime: booking.end_time,
      startMinutes: 0,
      endMinutes: 0,
      isActive: false
    };
  }

  const effectiveStart = booking.walk_in_actual_start_time || booking.start_time;
  let effectiveEnd = booking.walk_in_actual_end_time || booking.end_time;

  // If completed early, use completed time if earlier than scheduled end
  if (booking.booking_status === 'completed' && booking.completed_at) {
    const completedDate = new Date(booking.completed_at);
    const completedTimeStr = `${completedDate.getHours().toString().padStart(2, '0')}:${completedDate.getMinutes().toString().padStart(2, '0')}`;
    const compMins = timeToMinutes(completedTimeStr);
    const schedMins = timeToMinutes(effectiveEnd);
    if (compMins < schedMins && compMins > timeToMinutes(effectiveStart)) {
      effectiveEnd = completedTimeStr;
    }
  }

  const startMinutes = timeToMinutes(effectiveStart);
  const endMinutes = timeToMinutes(effectiveEnd);

  return {
    startTime: effectiveStart,
    endTime: effectiveEnd,
    startMinutes,
    endMinutes,
    isActive: true
  };
}

/**
 * Checks whether a specific equipment unit is available for a given time range on a date.
 */
export function isUnitAvailable(
  resourceId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  excludeBookingId?: string,
  blockedSlots: Slot[] = []
): { 
  available: boolean; 
  conflictingBooking?: Booking; 
  conflictingReason?: string 
} {
  const reqStartMins = timeToMinutes(startTime);
  const reqEndMins = timeToMinutes(endTime);

  if (reqStartMins >= reqEndMins) {
    return { available: false, conflictingReason: 'Invalid time range: start time must be before end time.' };
  }

  // 1. Check all bookings for this unit on this date
  const unitBookings = bookings.filter(
    b => b.resource_id === resourceId && 
         b.booking_date === date && 
         b.id !== excludeBookingId
  );

  for (const b of unitBookings) {
    const times = getEffectiveBookingTimes(b);
    if (!times.isActive) continue;

    // Check overlap: new_start < existing_end AND new_end > existing_start
    if (reqStartMins < times.endMinutes && reqEndMins > times.startMinutes) {
      const clientName = b.walk_in_customer_name || 'Reserved Client';
      return {
        available: false,
        conflictingBooking: b,
        conflictingReason: `Unit is occupied from ${formatTimeDisplay(times.startTime)} to ${formatTimeDisplay(times.endTime)} by ${clientName} (${b.booking_ref}).`
      };
    }
  }

  // 2. Check manually blocked slots
  const unitBlockedSlots = blockedSlots.filter(
    s => s.resource_id === resourceId && 
         s.slot_date === date && 
         s.status === 'blocked'
  );

  for (const s of unitBlockedSlots) {
    const bStartMins = timeToMinutes(s.start_time);
    const bEndMins = timeToMinutes(s.end_time);

    if (reqStartMins < bEndMins && reqEndMins > bStartMins) {
      return {
        available: false,
        conflictingReason: `Unit is blocked for ${s.blocked_reason || 'Maintenance'} from ${s.start_time} to ${s.end_time}.`
      };
    }
  }

  return { available: true };
}

/**
 * Evaluates how many minutes a currently active booking session can be extended.
 * Checks for any upcoming bookings starting after the current session's end time.
 */
export function getMaxExtensionDuration(
  booking: Booking,
  allBookings: Booking[],
  maxAllowedMinutes: number = 240, // default max 4 hours extension
  blockedSlots: Slot[] = []
): {
  maxMinutes: number;
  nextBooking?: Booking;
  nextBookingStartTime?: string;
  canExtend: boolean;
} {
  const currentTimes = getEffectiveBookingTimes(booking);
  const currentEndMins = currentTimes.endMinutes;

  // Find all future bookings for this unit on this date that start at or after currentEnd
  const upcomingBookings = allBookings
    .filter(b => 
      b.resource_id === booking.resource_id &&
      b.booking_date === booking.booking_date &&
      b.id !== booking.id
    )
    .map(b => ({ booking: b, times: getEffectiveBookingTimes(b) }))
    .filter(item => item.times.isActive && item.times.startMinutes >= currentEndMins)
    .sort((a, b) => a.times.startMinutes - b.times.startMinutes);

  // Also check blocked slots after current end
  const upcomingBlocked = blockedSlots
    .filter(s => 
      s.resource_id === booking.resource_id &&
      s.slot_date === booking.booking_date &&
      s.status === 'blocked'
    )
    .map(s => ({ startMinutes: timeToMinutes(s.start_time), slot: s }))
    .filter(s => s.startMinutes >= currentEndMins)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  let earliestConflictMins = currentEndMins + maxAllowedMinutes;
  let nextBooking: Booking | undefined;
  let nextBookingStartTime: string | undefined;

  if (upcomingBookings.length > 0) {
    const firstB = upcomingBookings[0];
    if (firstB.times.startMinutes < earliestConflictMins) {
      earliestConflictMins = firstB.times.startMinutes;
      nextBooking = firstB.booking;
      nextBookingStartTime = firstB.times.startTime;
    }
  }

  if (upcomingBlocked.length > 0) {
    const firstBlocked = upcomingBlocked[0];
    if (firstBlocked.startMinutes < earliestConflictMins) {
      earliestConflictMins = firstBlocked.startMinutes;
      nextBookingStartTime = firstBlocked.slot.start_time;
    }
  }

  const freeGapMins = Math.max(0, earliestConflictMins - currentEndMins);
  const maxMinutes = Math.min(freeGapMins, maxAllowedMinutes);

  return {
    maxMinutes,
    nextBooking,
    nextBookingStartTime,
    canExtend: maxMinutes >= 15 // At least 15 minutes required for meaningful extension
  };
}

/**
 * Returns all active units of an equipment type that are free during the requested interval.
 */
export function getAvailableUnitsForInterval(
  venueId: string,
  equipmentType: string,
  date: string,
  startTime: string,
  endTime: string,
  resources: VenueResource[],
  bookings: Booking[],
  blockedSlots: Slot[] = []
): VenueResource[] {
  const matchingUnits = resources.filter(
    r => r.venue_id === venueId && 
         r.type.toLowerCase() === equipmentType.toLowerCase() && 
         r.is_active !== false
  );

  return matchingUnits.filter(unit => {
    const status = isUnitAvailable(unit.id, date, startTime, endTime, bookings, undefined, blockedSlots);
    return status.available;
  });
}

/**
 * Calculates hourly availability status for a resource across operating hours.
 * Uses interval overlap checks so walk-ins at e.g. 11:15-12:45 accurately reflect
 * in both the 11:00-12:00 and 12:00-13:00 slots.
 */
export function getHourlyAvailabilityForResource(
  resourceId: string,
  date: string,
  operatingHours: { start: string; end: string } = { start: '09:00', end: '23:00' },
  bookings: Booking[],
  blockedSlots: Slot[] = []
): Array<{
  hour: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'held' | 'blocked';
  booking?: Booking;
  detail: string;
}> {
  const startH = parseInt(operatingHours.start.split(':')[0], 10) || 9;
  const endH = parseInt(operatingHours.end.split(':')[0], 10) || 23;
  const totalSlots = Math.max(1, endH - startH);

  const result = [];

  for (let i = 0; i < totalSlots; i++) {
    const curH = startH + i;
    const nextH = curH + 1;
    const startStr = `${curH.toString().padStart(2, '0')}:00`;
    const endStr = `${nextH.toString().padStart(2, '0')}:00`;

    // Overlap check with bookings
    const unitBookings = bookings.filter(
      b => b.resource_id === resourceId && b.booking_date === date
    );

    let matchedBooking: Booking | undefined;
    let slotStatus: 'available' | 'booked' | 'held' | 'blocked' = 'available';
    let detail = 'Available';

    for (const b of unitBookings) {
      const times = getEffectiveBookingTimes(b);
      if (!times.isActive) continue;

      if (doIntervalsOverlap(startStr, endStr, times.startTime, times.endTime)) {
        matchedBooking = b;
        if (b.booking_status === 'checked_in') {
          slotStatus = 'booked';
          detail = `In Session: ${b.walk_in_customer_name || 'Client'} (${times.startTime}-${times.endTime})`;
        } else if (b.booking_status === 'confirmed') {
          slotStatus = 'booked';
          detail = `Confirmed: ${b.walk_in_customer_name || 'Online Booking'} (${times.startTime}-${times.endTime})`;
        } else if (b.booking_status === 'held') {
          slotStatus = 'held';
          detail = `Soft Hold: ${b.walk_in_customer_name || 'Client'} (${times.startTime}-${times.endTime})`;
        }
        break;
      }
    }

    // If no booking overlap, check blocked slots
    if (slotStatus === 'available') {
      const isBlocked = blockedSlots.some(
        s => s.resource_id === resourceId && 
             s.slot_date === date && 
             s.status === 'blocked' &&
             doIntervalsOverlap(startStr, endStr, s.start_time, s.end_time)
      );

      if (isBlocked) {
        slotStatus = 'blocked';
        detail = 'Blocked (Maintenance / Break)';
      }
    }

    result.push({
      hour: startStr,
      start_time: startStr,
      end_time: endStr,
      status: slotStatus,
      booking: matchedBooking,
      detail
    });
  }

  return result;
}
