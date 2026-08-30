import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking, Venue, VenueResource, Slot } from '../../types';
import { 
  Loader2, AlertTriangle, CheckSquare, Clock, Tv, Calendar, ShieldCheck, 
  Mail, ArrowRight, ShieldAlert, Zap, Cpu, Play, Square, FastForward, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  timeToMinutes, minutesToTime, addMinutesToTime, formatTimeDisplay, 
  getEffectiveBookingTimes, getMaxExtensionDuration, getHourlyAvailabilityForResource 
} from '../../lib/availability';

interface DashboardTabProps {
  venue: Venue | null;
  onOpenWalkIn: (prefilled?: { resourceId: string; date: string; hour: string } | null) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ venue, onOpenWalkIn }) => {
  const { 
    currentUser, bookings, resources, slots, 
    ownerCheckIn, ownerExtendHold, ownerReleaseSlot, bulkBlockSlots, bulkUnblockSlots,
    extendBookingSession, endBookingEarly, ownerCompleteBooking
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Confirmatory modals
  const [checkInConfirmBooking, setCheckInConfirmBooking] = useState<Booking | null>(null);
  const [extendHoldConfirmBooking, setExtendHoldConfirmBooking] = useState<Booking | null>(null);
  const [releaseConfirmBooking, setReleaseConfirmBooking] = useState<Booking | null>(null);
  
  // Session Management Modals
  const [extendSessionBooking, setExtendSessionBooking] = useState<Booking | null>(null);
  const [extendMins, setExtendMins] = useState<number>(30);
  const [customExtendMins, setCustomExtendMins] = useState<string>('');
  const [additionalPayment, setAdditionalPayment] = useState<number | ''>('');
  const [isExtending, setIsExtending] = useState(false);

  const [endEarlyBooking, setEndEarlyBooking] = useState<Booking | null>(null);
  const [endEarlyPaymentCollected, setEndEarlyPaymentCollected] = useState<number | ''>('');
  const [isEndingEarly, setIsEndingEarly] = useState(false);

  // Blocking modal state
  const [blockCellSlot, setBlockCellSlot] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('Maintenance');

  const [tick, setTick] = useState(0);

  // Live seconds tick for countdown timers
  useEffect(() => {
    const tm = setInterval(() => {
      setCurrentTime(new Date());
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(tm);
  }, []);

  // Filter parameters for current venue
  const currentVenueBookings = useMemo(() => {
    if (!venue) return [];
    return bookings.filter(b => b.venue_id === venue.id);
  }, [venue, bookings]);

  const currentVenueResources = useMemo(() => {
    if (!venue) return [];
    return resources.filter(r => r.venue_id === venue.id && r.is_active !== false);
  }, [venue, resources]);

  const todayStr = useMemo(() => {
    return currentTime.toISOString().split('T')[0];
  }, [currentTime]);

  const currentTimeMinutes = useMemo(() => {
    return currentTime.getHours() * 60 + currentTime.getMinutes();
  }, [currentTime]);

  // Greetings logic
  const greetingText = useMemo(() => {
    const hours = currentTime.getHours();
    let phrase = 'Good morning';
    if (hours >= 12 && hours < 17) phrase = 'Good afternoon';
    else if (hours >= 17) phrase = 'Good evening';
    return `${phrase}, ${(currentUser?.full_name || '').split(' ')[0] || 'Partner'}! 👋`;
  }, [currentTime, currentUser]);

  // Statistics calculation
  const stats = useMemo(() => {
    const todayBookings = currentVenueBookings.filter(b => b.booking_date === todayStr);
    
    // total count
    const totalCount = todayBookings.length;
    const online = todayBookings.filter(b => b.payment_method === 'online').length;
    const walkInCount = todayBookings.filter(b => b.payment_method === 'walk_in').length;
    const holds = todayBookings.filter(b => b.payment_method === 'pay_at_venue').length;

    // today gross revenue
    const todayCompleted = todayBookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'checked_in' || b.booking_status === 'confirmed');
    const gross = todayCompleted.reduce((acc, curr) => acc + curr.final_amount, 0);
    const net = Math.round(gross * 0.9); // after 10% commission

    // Month stats
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    const monthlyBookings = currentVenueBookings.filter(b => {
      const d = new Date(b.booking_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (b.booking_status === 'completed' || b.booking_status === 'checked_in');
    });
    const monthlyGross = monthlyBookings.reduce((acc, curr) => acc + curr.final_amount, 0);
    const monthlyNet = Math.round(monthlyGross * 0.9);

    // Live Active Units Count
    const activeRunningCount = currentVenueResources.filter(res => {
      return currentVenueBookings.some(b => {
        if (b.resource_id !== res.id || b.booking_date !== todayStr) return false;
        if (b.booking_status !== 'checked_in' && b.payment_method !== 'walk_in') return false;
        if (b.booking_status === 'completed' || b.booking_status === 'cancelled') return false;
        const times = getEffectiveBookingTimes(b);
        return times.isActive && currentTimeMinutes >= times.startMinutes && currentTimeMinutes < times.endMinutes;
      });
    }).length;

    // circular occupancy
    const maxActiveHourSlots = currentVenueResources.length * 15; // 9 AM to 11 PM = 15 slots daily
    const filledSlotsCount = slots.filter(s => s.venue_id === venue?.id && s.slot_date === todayStr && (s.status === 'booked' || s.status === 'held')).length;
    const occupancyPercent = maxActiveHourSlots > 0 ? Math.round((filledSlotsCount / maxActiveHourSlots) * 100) : 0;

    return {
      totalCount,
      online,
      walkInCount,
      holds,
      gross,
      net,
      monthlyNet,
      activeRunningCount,
      totalUnits: currentVenueResources.length,
      occupancyPercent,
      filledSlotsCount,
      maxActiveHourSlots
    };
  }, [currentVenueBookings, currentVenueResources, slots, venue, currentTime, todayStr, currentTimeMinutes]);

  // Live Unit Statuses for the Real-time Monitor
  const liveUnitStatuses = useMemo(() => {
    return currentVenueResources.map(res => {
      const unitTodayBookings = currentVenueBookings.filter(b => 
        b.resource_id === res.id && 
        b.booking_date === todayStr &&
        b.booking_status !== 'cancelled' &&
        b.booking_status !== 'no_show'
      );

      // Find currently active session (playing right now)
      let activeBooking: Booking | null = null;
      let activeTimes: any = null;

      for (const b of unitTodayBookings) {
        if (b.booking_status === 'completed') continue;
        const times = getEffectiveBookingTimes(b);
        if (times.isActive && currentTimeMinutes >= times.startMinutes && currentTimeMinutes < times.endMinutes) {
          activeBooking = b;
          activeTimes = times;
          break;
        }
      }

      // Find active soft hold (starts around now or held)
      let softHoldBooking: Booking | null = null;
      if (!activeBooking) {
        softHoldBooking = unitTodayBookings.find(b => 
          b.booking_status === 'held' && 
          b.payment_method === 'pay_at_venue'
        ) || null;
      }

      // Find next upcoming booking today after currentTimeMinutes
      let nextBooking: Booking | null = null;
      let nextBookingTimes: any = null;

      const futureBookings = unitTodayBookings
        .map(b => ({ booking: b, times: getEffectiveBookingTimes(b) }))
        .filter(item => item.times.isActive && item.times.startMinutes > currentTimeMinutes && item.booking.id !== activeBooking?.id)
        .sort((a, b) => a.times.startMinutes - b.times.startMinutes);

      if (futureBookings.length > 0) {
        nextBooking = futureBookings[0].booking;
        nextBookingTimes = futureBookings[0].times;
      }

      return {
        resource: res,
        activeBooking,
        activeTimes,
        softHoldBooking,
        nextBooking,
        nextBookingTimes
      };
    });
  }, [currentVenueResources, currentVenueBookings, todayStr, currentTimeMinutes]);

  // Hourly Matrix Schedule View data using interval overlap calculations
  const gridTimelineMatrix = useMemo(() => {
    const sHour = venue ? parseInt((venue.operating_hours_start || '09:00').split(':')[0], 10) || 9 : 9;
    const eHour = venue ? parseInt((venue.operating_hours_end || '22:00').split(':')[0], 10) || 22 : 22;
    const length = Math.max(1, eHour - sHour + 1);

    const isTodayClosed = venue?.closed_dates?.includes(todayStr);

    return currentVenueResources.map(res => {
      const hourlyStatuses = getHourlyAvailabilityForResource(
        res.id,
        todayStr,
        { start: `${sHour.toString().padStart(2, '0')}:00`, end: `${eHour.toString().padStart(2, '0')}:00` },
        currentVenueBookings,
        slots
      );

      const columns = hourlyStatuses.map(col => {
        let color: 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'rose' = 'green';
        let detail = col.detail;
        let bookingId: string | null = col.booking?.id || null;

        if (isTodayClosed) {
          color = 'rose';
          detail = 'Venue Closed (Holiday/Break)';
        } else if (col.status === 'booked') {
          if (col.booking?.booking_status === 'checked_in' || col.booking?.payment_method === 'walk_in') {
            color = 'red';
          } else {
            color = 'blue';
          }
        } else if (col.status === 'held') {
          color = 'yellow';
        } else if (col.status === 'blocked') {
          color = 'gray';
        }

        return {
          hour: col.hour,
          color,
          detail,
          bookingId,
          resourceId: res.id,
          date: todayStr,
          isClosed: isTodayClosed
        };
      });

      return {
        resource: res,
        columns
      };
    });
  }, [currentVenueResources, currentVenueBookings, slots, todayStr, venue]);

  // Recent Activity Logs
  const recentActivityLogs = useMemo(() => {
    const logsList: Array<{ icon: string; text: string; details: string; time: string }> = [];
    currentVenueBookings.slice(-10).reverse().forEach(b => {
      const isPaid = b.payment_method === 'online' || b.payment_method === 'token_advance';
      
      let icon = '🎮';
      let text = `Updated booking - ${b.booking_ref}`;
      
      if (b.payment_method === 'walk_in') {
        icon = '🚶';
        text = `Walk-in registered - ${b.walk_in_customer_name || 'Player'}`;
      } else if (b.booking_status === 'no_show') {
        icon = '🚫';
        text = `No-Show logged: Slot recycled`;
      } else if (b.booking_status === 'checked_in') {
        icon = '✅';
        text = `Check-In confirmed - ${b.booking_ref}`;
      } else if (b.booking_status === 'completed') {
        icon = '🏁';
        text = `Session completed - ${b.booking_ref}`;
      } else if (b.booking_status === 'cancelled') {
        icon = '❌';
        text = `Booking cancelled`;
      } else {
        icon = isPaid ? '💳' : '⏳';
        text = isPaid ? `New paid booking locked!` : `New Pay-at-Venue soft hold`;
      }

      logsList.push({
        icon,
        text,
        details: `${currentVenueResources.find(r => r.id === b.resource_id)?.name || 'Station'} · ${b.walk_in_actual_start_time || b.start_time} - ${b.walk_in_actual_end_time || b.end_time}`,
        time: 'Recent'
      });
    });

    if (logsList.length === 0) {
      logsList.push({
        icon: '📢',
        text: 'System online',
        details: 'Equipment availability engine active.',
        time: 'now'
      });
    }

    return logsList;
  }, [currentVenueBookings, currentVenueResources]);

  // Handle Extend Session Logic
  const handleOpenExtendSession = (b: Booking) => {
    setExtendSessionBooking(b);
    setExtendMins(30);
    setCustomExtendMins('');
    
    // Auto calculate additional price based on 30 mins
    const res = currentVenueResources.find(r => r.id === b.resource_id);
    if (res) {
      setAdditionalPayment(Math.round(res.price_per_hour * 0.5));
    } else {
      setAdditionalPayment('');
    }
  };

  const handleExecuteExtendSession = async () => {
    if (!extendSessionBooking) return;
    setIsExtending(true);
    try {
      const extraMinutes = customExtendMins ? parseInt(customExtendMins, 10) : extendMins;
      if (isNaN(extraMinutes) || extraMinutes <= 0) {
        toast.error('Please specify valid extension minutes');
        setIsExtending(false);
        return;
      }

      const res = await extendBookingSession(
        extendSessionBooking.id, 
        extraMinutes, 
        additionalPayment !== '' ? Number(additionalPayment) : undefined
      );

      if (res.success) {
        toast.success(`Session extended by ${extraMinutes} minutes! New end time: ${formatTimeDisplay(res.newEndTime || '')} ⏱️`);
        setExtendSessionBooking(null);
      } else {
        toast.error(res.error || 'Could not extend session');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to extend session');
    } finally {
      setIsExtending(false);
    }
  };

  // Handle End Session Early Logic
  const handleOpenEndEarly = (b: Booking) => {
    setEndEarlyBooking(b);
    setEndEarlyPaymentCollected(b.final_amount);
  };

  const handleExecuteEndEarly = async () => {
    if (!endEarlyBooking) return;
    setIsEndingEarly(true);
    try {
      const res = await endBookingEarly(
        endEarlyBooking.id, 
        endEarlyPaymentCollected !== '' ? Number(endEarlyPaymentCollected) : undefined
      );

      if (res.success) {
        toast.success(`Session ended early. Station freed immediately for new players! 🏁`);
        setEndEarlyBooking(null);
      } else {
        toast.error(res.error || 'Could not end session early');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to complete session');
    } finally {
      setIsEndingEarly(false);
    }
  };

  // Modal actions handlers for Check-In
  const handleConfirmCheckIn = () => {
    if (checkInConfirmBooking) {
      ownerCheckIn(checkInConfirmBooking.id);
      toast.success('Customer checked in successfully! Session is now active.');
      setCheckInConfirmBooking(null);
    }
  };

  const handleConfirmExtendHold = () => {
    if (extendHoldConfirmBooking) {
      ownerExtendHold(extendHoldConfirmBooking.id);
      toast.success('Hold window increased by 15 added minutes.');
      setExtendHoldConfirmBooking(null);
    }
  };

  const handleConfirmRelease = () => {
    if (releaseConfirmBooking) {
      ownerReleaseSlot(releaseConfirmBooking.id);
      toast.success('Soft hold cancelled. Opening walk-in selector...');
      
      const payloadRef = { 
        resourceId: releaseConfirmBooking.resource_id, 
        date: releaseConfirmBooking.booking_date, 
        hour: releaseConfirmBooking.start_time 
      };
      
      setReleaseConfirmBooking(null);
      onOpenWalkIn(payloadRef);
    }
  };

  const handleBlockGridCell = (cell: any) => {
    if (venue?.closed_dates?.includes(cell.date)) {
      toast.error('Venue is closed today (Configured in Settings)');
      return;
    }
    if (cell.color === 'green') {
      setBlockCellSlot(cell);
      setBlockReason('Maintenance');
    } else if (cell.color === 'gray') {
      bulkUnblockSlots(cell.resourceId, cell.date, [cell.hour]);
      toast.success('Slot unblocked!');
    } else {
      toast.error('Cannot modify details of an active slot');
    }
  };

  const executeBulkBlock = () => {
    if (blockCellSlot) {
      bulkBlockSlots(blockCellSlot.resourceId, blockCellSlot.date, [blockCellSlot.hour], blockReason);
      toast.success(`Slot blocked at ${blockCellSlot.hour} for ${blockReason}`);
      setBlockCellSlot(null);
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#12121A] p-6 rounded-2xl border border-border-dark">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white">{greetingText}</h2>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Running arena console for <span className="text-white font-bold">{venue?.name || 'Your Arena'}</span> · {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onOpenWalkIn()}
            className="px-4 py-2.5 btn-gradient text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-purple/20"
          >
            <span>＋ Start Walk-In</span>
          </button>
        </div>
      </div>

      {/* TODAY KEY STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block font-bold">Active Rigs Running</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl sm:text-4xl font-mono font-black text-emerald-400">{stats.activeRunningCount}</h3>
            <span className="text-sm font-mono text-text-secondary">/ {stats.totalUnits} units</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">
            {stats.totalUnits - stats.activeRunningCount} station{stats.totalUnits - stats.activeRunningCount !== 1 ? 's' : ''} currently free
          </p>
          <div className="absolute right-4 bottom-4 text-emerald-400 font-mono text-[10px] font-bold bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            Live
          </div>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block font-bold">Today's Revenue (Gross)</span>
          <h3 className="text-3xl sm:text-4xl font-mono font-black mt-2 text-white">₹{stats.gross}</h3>
          <p className="text-[10px] text-emerald-400 mt-1 font-bold font-mono">
            Net: ₹{stats.net} (after 10% GARF fee)
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block font-bold">Total Bookings Today</span>
          <h3 className="text-3xl sm:text-4xl font-mono font-black mt-2 text-white">{stats.totalCount}</h3>
          <p className="text-[10px] text-text-secondary mt-1 font-mono">
            Walk-ins: {stats.walkInCount} · Online: {stats.online} · Holds: {stats.holds}
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block font-bold">Slot Occupancy</span>
            <div className="text-2xl font-mono font-black text-white">{stats.occupancyPercent}%</div>
            <p className="text-[9px] text-text-secondary">
              {stats.filledSlotsCount} of {stats.maxActiveHourSlots} hour blocks
            </p>
          </div>
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="#252538" strokeWidth="4" fill="transparent" />
              <circle 
                cx="28" 
                cy="28" 
                r="22" 
                stroke={stats.occupancyPercent < 40 ? '#ef4444' : stats.occupancyPercent < 70 ? '#f59e0b' : '#10b981'} 
                strokeWidth="4" 
                fill="transparent" 
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * stats.occupancyPercent) / 100}
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-bold text-white">{stats.occupancyPercent}%</span>
          </div>
        </div>

      </div>

      {/* 🟢 REAL-TIME LIVE EQUIPMENT UNITS & SESSIONS MONITOR */}
      <div className="bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-border-dark">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <h3 className="font-bold font-display text-white text-lg">
                Live Equipment Rigs & Active Sessions
              </h3>
              <p className="text-xs text-text-secondary">
                Real-time console occupancy. Extend active play sessions or release stations early at any minute.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-text-secondary">
            Clock: <strong className="text-white">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
          </span>
        </div>

        {currentVenueResources.length === 0 ? (
          <div className="text-center py-10 text-text-secondary text-sm">
            No equipment stations configured yet. Go to "Station Specs" to add gaming rigs.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveUnitStatuses.map(({ resource, activeBooking, activeTimes, softHoldBooking, nextBooking, nextBookingTimes }) => {
              const isOccupied = !!activeBooking;
              const isHeld = !activeBooking && !!softHoldBooking;
              
              // Calculate remaining minutes for active session
              let remainingMins = 0;
              let elapsedPercent = 0;
              if (activeBooking && activeTimes) {
                remainingMins = Math.max(0, activeTimes.endMinutes - currentTimeMinutes);
                const totalDuration = activeTimes.endMinutes - activeTimes.startMinutes;
                const elapsed = currentTimeMinutes - activeTimes.startMinutes;
                elapsedPercent = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 0;
              }

              return (
                <div 
                  key={resource.id} 
                  className={`p-5 rounded-2xl border transition flex flex-col justify-between gap-4 ${
                    isOccupied 
                      ? 'bg-[#151522] border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                      : isHeld 
                        ? 'bg-[#151522] border-yellow-500/30' 
                        : 'bg-[#12121A] border-[#252538] hover:border-[#3a3a56]'
                  }`}
                >
                  {/* Card Header: Unit Name & Status Badge */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isOccupied ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-purple/10 text-brand-purple'}`}>
                        {resource.type === 'pc' ? <Cpu className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base font-display">
                          {resource.name}
                        </h4>
                        <span className="text-[10px] font-mono text-text-secondary uppercase">
                          {resource.type} · ₹{resource.price_per_hour}/hr
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isOccupied 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse' 
                        : isHeld 
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' 
                          : 'bg-text-secondary/10 text-text-secondary border border-text-secondary/20'
                    }`}>
                      {isOccupied ? '🟢 IN SESSION' : isHeld ? '🟡 HELD' : '⚪ AVAILABLE'}
                    </span>
                  </div>

                  {/* Card Body: Active Session or Free state */}
                  {isOccupied && activeBooking && activeTimes ? (
                    <div className="space-y-3 bg-[#1A1A2E] p-3.5 rounded-xl border border-emerald-500/20">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-text-secondary block">PLAYER</span>
                          <strong className="text-white font-sans text-sm">
                            {activeBooking.walk_in_customer_name || 'Customer'}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-text-secondary block">TIME REMAINING</span>
                          <strong className="text-emerald-400 font-mono text-sm font-black">
                            {remainingMins > 0 ? `${remainingMins}m left` : 'Time ending'}
                          </strong>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#12121A] h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full transition-all duration-1000"
                          style={{ width: `${elapsedPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-text-secondary">
                        <span>Started: <strong className="text-white">{formatTimeDisplay(activeTimes.startTime)}</strong></span>
                        <span>Ends: <strong className="text-white">{formatTimeDisplay(activeTimes.endTime)}</strong></span>
                      </div>

                      {/* Active Actions: Extend & End Early */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenExtendSession(activeBooking)}
                          className="flex-1 py-1.5 bg-brand-purple/20 hover:bg-brand-purple/30 border border-brand-purple/40 text-brand-purple rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <FastForward className="h-3.5 w-3.5" />
                          <span>Extend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEndEarly(activeBooking)}
                          className="flex-1 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <Square className="h-3.5 w-3.5" />
                          <span>End Early</span>
                        </button>
                      </div>
                    </div>
                  ) : isHeld && softHoldBooking ? (
                    <div className="space-y-3 bg-[#1A1A2E] p-3.5 rounded-xl border border-yellow-500/20">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-text-secondary block">HOLD CLIENT</span>
                          <strong className="text-yellow-400 font-sans">
                            {softHoldBooking.walk_in_customer_name || 'Client Reservation'}
                          </strong>
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {softHoldBooking.start_time} - {softHoldBooking.end_time}
                        </span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setCheckInConfirmBooking(softHoldBooking)}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() => setReleaseConfirmBooking(softHoldBooking)}
                          className="px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Release
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-[#12121A] p-3.5 rounded-xl border border-[#232338]">
                      <div className="text-xs text-text-secondary">
                        {nextBooking && nextBookingTimes ? (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-brand-purple block uppercase font-bold">
                              Next Reserved Booking
                            </span>
                            <div className="text-white font-mono text-xs">
                              {formatTimeDisplay(nextBookingTimes.startTime)} — {nextBooking.walk_in_customer_name || 'Online Client'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-secondary text-xs">
                            Free for the rest of today's operating hours.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenWalkIn({ resourceId: resource.id, date: todayStr, hour: minutesToTime(currentTimeMinutes) })}
                        className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Play className="h-3 w-3" />
                        <span>Start Walk-In on this rig</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VISUAL HOURLY BLOCK TIMELINE */}
      <div className="bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 border-b border-border-dark">
          <div>
            <h4 className="font-bold font-display text-white text-base">Visual Schedule Timeline (Today's Operating Hours)</h4>
            <p className="text-xs text-text-secondary">Reflects real-time interval walk-ins & online bookings. Click any green cell to block it.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] text-text-secondary font-mono">
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-emerald-400 rounded-full"></span> Available</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-[#7C3AED] rounded-full"></span> Confirmed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-red-500 rounded-full"></span> In Session</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-yellow-500 rounded-full"></span> Soft Hold</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-gray-600 rounded-full"></span> Blocked</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead>
              <tr className="border-b border-[#2A2A3E]">
                <th className="py-2.5 px-3 min-w-[140px] font-bold text-white uppercase font-mono">Station Rig</th>
                {gridTimelineMatrix[0]?.columns.map(col => {
                  const hourNum = parseInt(col.hour.split(':')[0], 10);
                  return (
                    <th key={col.hour} className="py-2.5 px-1 text-center font-mono text-[10px]">
                      {hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {gridTimelineMatrix.map(row => (
                <tr key={row.resource.id} className="border-b border-[#1C1C2D]">
                  <td className="py-3 px-3 font-bold text-white">{row.resource.name}</td>
                  {row.columns.map(col => {
                    const statusStyles = 
                      col.color === 'rose'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 opacity-60 cursor-not-allowed'
                        : col.color === 'green'
                          ? 'bg-emerald-400/10 hover:bg-emerald-400/25 border-emerald-400/20 text-emerald-400'
                          : col.color === 'yellow'
                            ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-500'
                            : col.color === 'blue'
                              ? 'bg-[#7C3AED]/20 border-[#7C3AED]/35 text-[#a8a8cf]'
                              : col.color === 'red'
                                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                : 'bg-gray-600/10 border-gray-600/20 text-text-secondary/50';

                    return (
                      <td key={col.hour} className="p-1">
                        <button
                          type="button"
                          onClick={() => handleBlockGridCell(col)}
                          title={col.detail}
                          className={`w-full py-2 border rounded text-[9px] font-bold tracking-tighter text-center transition cursor-pointer select-none ${statusStyles}`}
                        >
                          <span className="font-mono">{col.hour}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ACTIVITY LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT BOOKINGS TABLE */}
        <div className="lg:col-span-7 bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-border-dark pb-2">
            <h4 className="font-bold font-display text-white text-base">Recent Ledger Bookings</h4>
            <span className="text-[10px] font-mono text-text-secondary">Last 5 units</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-secondary border-b border-border-dark">
                  <th className="py-2">Ref</th>
                  <th className="py-2">Player</th>
                  <th className="py-2">Rig</th>
                  <th className="py-2">Timeline</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C2D]">
                {currentVenueBookings.slice(-5).reverse().map(b => (
                  <tr key={b.id} className="text-white">
                    <td className="py-3 font-mono text-text-secondary text-[11px] font-bold">{b.booking_ref}</td>
                    <td className="py-3 font-semibold">
                      {b.walk_in_customer_name || 'Player'}
                    </td>
                    <td className="py-3 text-text-secondary">
                      {currentVenueResources.find(r => r.id === b.resource_id)?.name || 'Station'}
                    </td>
                    <td className="py-3 font-mono text-xs">
                      {b.walk_in_actual_start_time ? (
                        <span className="text-emerald-400 font-bold">
                          {formatTimeDisplay(b.walk_in_actual_start_time)} - {formatTimeDisplay(b.walk_in_actual_end_time || '')}
                        </span>
                      ) : (
                        <span>{formatTimeDisplay(b.start_time)} - {formatTimeDisplay(b.end_time)}</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold leading-normal ${
                        b.booking_status === 'confirmed'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : b.booking_status === 'checked_in'
                            ? 'bg-brand-cyan/15 text-brand-cyan'
                            : b.booking_status === 'completed'
                              ? 'bg-gray-500/15 text-text-secondary'
                              : 'bg-red-500/15 text-red-400'
                      }`}>
                        {b.booking_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT FEED LOGS */}
        <div className="lg:col-span-5 bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-border-dark pb-2">
            <h4 className="font-bold font-display text-white text-base">Client Activity Feed</h4>
            <span className="text-[10px] font-mono text-text-secondary">Live Events Log</span>
          </div>

          <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
            {recentActivityLogs.map((log, idx) => (
              <div key={idx} className="flex gap-3 items-start text-xs border-b border-[#12121A] pb-3 last:border-0 last:pb-0">
                <span className="text-base">{log.icon}</span>
                <div className="flex-grow space-y-0.5">
                  <p className="font-semibold text-white">{log.text}</p>
                  <p className="text-[10px] text-text-secondary font-mono">{log.details}</p>
                </div>
                <span className="text-[9px] text-text-secondary/50 font-mono mt-0.5">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ⏱️ EXTEND SESSION MODAL */}
      {extendSessionBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#1A1A2E] border border-brand-purple/30 p-6 rounded-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-[#2a2a3e] pb-3">
              <div className="flex items-center gap-2 text-brand-purple">
                <FastForward className="h-5 w-5" />
                <h4 className="font-bold font-display text-white text-lg">Extend Live Session</h4>
              </div>
              <button onClick={() => setExtendSessionBooking(null)} className="text-text-secondary hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {/* Session Info */}
            <div className="bg-[#12121A] p-3.5 rounded-xl border border-border-dark text-xs font-mono space-y-1">
              <div>Station: <strong className="text-white">{currentVenueResources.find(r => r.id === extendSessionBooking.resource_id)?.name}</strong></div>
              <div>Player: <strong className="text-white">{extendSessionBooking.walk_in_customer_name || 'Client'}</strong> ({extendSessionBooking.booking_ref})</div>
              <div>
                Current Window: <strong className="text-emerald-400">{formatTimeDisplay(extendSessionBooking.walk_in_actual_start_time || extendSessionBooking.start_time)} → {formatTimeDisplay(extendSessionBooking.walk_in_actual_end_time || extendSessionBooking.end_time)}</strong>
              </div>
            </div>

            {/* Max Extension Analysis */}
            {(() => {
              const maxExt = getMaxExtensionDuration(extendSessionBooking, bookings, 240, slots);
              const requestedMins = customExtendMins ? parseInt(customExtendMins, 10) || 0 : extendMins;
              const canFit = requestedMins <= maxExt.maxMinutes;

              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-mono uppercase text-text-secondary font-bold">
                        Add Extension Time
                      </label>
                      <span className="text-xs font-mono text-brand-purple font-bold">
                        Max free: {maxExt.maxMinutes} mins
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          disabled={mins > maxExt.maxMinutes}
                          onClick={() => {
                            setExtendMins(mins);
                            setCustomExtendMins('');
                            const res = currentVenueResources.find(r => r.id === extendSessionBooking.resource_id);
                            if (res) {
                              setAdditionalPayment(Math.round(res.price_per_hour * (mins / 60)));
                            }
                          }}
                          className={`py-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer ${
                            extendMins === mins && !customExtendMins
                              ? 'bg-brand-purple text-white border-brand-purple shadow-md'
                              : mins > maxExt.maxMinutes
                                ? 'bg-black/20 text-text-secondary/40 border-[#2a2a3e] cursor-not-allowed'
                                : 'bg-[#12121A] text-text-secondary hover:text-white border-[#2a2a3e]'
                          }`}
                        >
                          +{mins}m
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-text-secondary font-mono">Custom mins:</span>
                      <input
                        type="number"
                        min="5"
                        max={maxExt.maxMinutes}
                        placeholder={`Up to ${maxExt.maxMinutes}`}
                        value={customExtendMins}
                        onChange={e => {
                          setCustomExtendMins(e.target.value);
                          const num = parseInt(e.target.value, 10);
                          const res = currentVenueResources.find(r => r.id === extendSessionBooking.resource_id);
                          if (!isNaN(num) && res) {
                            setAdditionalPayment(Math.round(res.price_per_hour * (num / 60)));
                          }
                        }}
                        className="w-28 bg-[#12121A] border border-[#2a2a3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none focus:border-brand-purple"
                      />
                    </div>
                  </div>

                  {/* Payment Field */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                      Additional Fee to Collect (₹)
                    </label>
                    <input
                      type="number"
                      value={additionalPayment}
                      onChange={e => setAdditionalPayment(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm font-mono text-white outline-none focus:border-brand-purple"
                    />
                  </div>

                  {!canFit && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-sans">
                      ⚠️ Next booking starts at {formatTimeDisplay(maxExt.nextBookingStartTime || '')}. You can only extend by up to {maxExt.maxMinutes} minutes.
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setExtendSessionBooking(null)}
                      className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!canFit || isExtending}
                      onClick={handleExecuteExtendSession}
                      className="w-1/2 py-2.5 btn-gradient text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isExtending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Confirm +{requestedMins}m</span>}
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ⏹️ END SESSION EARLY MODAL */}
      {endEarlyBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#1A1A2E] border border-red-500/30 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <Square className="h-5 w-5" />
              <h4 className="font-bold font-display text-white text-lg">End Session Early?</h4>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This will immediately conclude the session for <strong className="text-white">{endEarlyBooking.walk_in_customer_name || 'Player'}</strong> and instantly release the station rig for subsequent walk-ins or bookings.
            </p>

            <div className="bg-[#12121A] p-3 rounded-xl border border-border-dark text-xs font-mono space-y-1">
              <div>Station: <strong className="text-white">{currentVenueResources.find(r => r.id === endEarlyBooking.resource_id)?.name}</strong></div>
              <div>Actual End: <strong className="text-emerald-400">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Right Now)</strong></div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                Final Settlement Collected (₹)
              </label>
              <input
                type="number"
                value={endEarlyPaymentCollected}
                onChange={e => setEndEarlyPaymentCollected(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm font-mono text-white outline-none focus:border-brand-purple"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEndEarlyBooking(null)}
                className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                disabled={isEndingEarly}
                onClick={handleExecuteEndEarly}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isEndingEarly ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>End & Free Station</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK IN CONFIRM POPUP */}
      {checkInConfirmBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-51 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-emerald-500/20 p-6 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold font-display text-white text-lg">Confirm Customer Arrival Check-In?</h4>
              <p className="text-xs text-text-secondary mt-1">
                Ref: {checkInConfirmBooking.booking_ref} for client <strong className="text-white">{checkInConfirmBooking.walk_in_customer_name || 'Customer'}</strong>.
              </p>
              <p className="text-xs text-emerald-400 font-mono mt-1 font-bold">
                They will check-in and settle ₹{checkInConfirmBooking.final_amount} at your supervisor counter.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setCheckInConfirmBooking(null)}
                className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold uppercase text-black cursor-pointer"
              >
                Yes, Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RELEASE CONFIRM POPUP */}
      {releaseConfirmBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-51 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-red-500/20 p-6 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-red-500/10 text-red-500 rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold font-display text-white text-lg">Release and Recycle Hold Slot?</h4>
              <p className="text-xs text-text-secondary mt-1">
                This will immediately cancel their hold booking. You can then assign this slot immediately to a walk-in client.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setReleaseConfirmBooking(null)}
                className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Keep Hold
              </button>
              <button
                onClick={handleConfirmRelease}
                className="w-1/2 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold text-white uppercase cursor-pointer"
              >
                Yes, Release Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRID BLOCK MODAL FORM */}
      {blockCellSlot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-51 p-4">
          <div className="w-full max-w-md bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
            <h4 className="font-bold font-display text-white text-lg flex items-center gap-2">
              <span>🔒 Block Slot: {blockCellSlot.hour}</span>
            </h4>
            <p className="text-xs text-text-secondary">
              Resource: {currentVenueResources.find(r => r.id === blockCellSlot.resourceId)?.name}. Blocking this prevents public catalog discovery for this hour.
            </p>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5">Reason for Block</label>
              <select
                className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2 text-sm text-white outline-none"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              >
                <option value="Maintenance">🔧 Maintenance / Repairs</option>
                <option value="Staff Break">☕ Staff Break / Shift swap</option>
                <option value="Personal Use">👤 Local Owner personal occupancy</option>
                <option value="Tournament">🏆 Tournament match locks</option>
              </select>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setBlockCellSlot(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkBlock}
                className="w-1/2 py-2 btn-gradient text-white rounded-lg text-xs font-bold uppercase cursor-pointer"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
