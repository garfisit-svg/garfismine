import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking, Venue, VenueResource, Slot } from '../../types';
import { Loader2, AlertTriangle, CheckSquare, Clock, Tv, Calendar, ShieldCheck, Mail, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { WalkInModal } from './WalkInModal';

interface DashboardTabProps {
  venue: Venue | null;
  onOpenWalkIn: (prefilled?: { resourceId: string; date: string; hour: string } | null) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ venue, onOpenWalkIn }) => {
  const { 
    currentUser, bookings, resources, slots, 
    ownerCheckIn, ownerExtendHold, ownerReleaseSlot, bulkBlockSlots, bulkUnblockSlots 
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Confirmatory modals
  const [checkInConfirmBooking, setCheckInConfirmBooking] = useState<Booking | null>(null);
  const [extendConfirmBooking, setExtendConfirmBooking] = useState<Booking | null>(null);
  const [releaseConfirmBooking, setReleaseConfirmBooking] = useState<Booking | null>(null);
  
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
    return resources.filter(r => r.venue_id === venue.id);
  }, [venue, resources]);

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
    const todayStr = currentTime.toISOString().split('T')[0];
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
      occupancyPercent,
      filledSlotsCount,
      maxActiveHourSlots
    };
  }, [currentVenueBookings, currentVenueResources, slots, venue, currentTime]);

  const recentActivityLogs = useMemo(() => {
    // Collect active elements
    const logsList: Array<{ icon: string; text: string; details: string; time: string }> = [];
    currentVenueBookings.slice(-10).reverse().forEach(b => {
      const isPaid = b.payment_method === 'online' || b.payment_method === 'token_advance';
      
      let icon = '🎮';
      let text = `Updated booking - ${b.booking_ref}`;
      
      if (b.payment_method === 'walk_in') {
        icon = '🚶';
        text = `Walk-in registered - ${b.walk_in_customer_name || 'Anonymous'}`;
      } else if (b.booking_status === 'no_show') {
        icon = '🚫';
        text = `No-Show logged: Slot recycled`;
      } else if (b.booking_status === 'checked_in') {
        icon = '✅';
        text = `Check-In confirmed - ${b.booking_ref}`;
      } else if (b.booking_status === 'cancelled') {
        icon = '❌';
        text = `Soft hold released`;
      } else {
        icon = isPaid ? '💳' : '⏳';
        text = isPaid ? `New paid booking locked!` : `New Pay-at-Venue soft hold`;
      }

      logsList.push({
        icon,
        text,
        details: `${currentVenueResources.find(r => r.id === b.resource_id)?.name || 'Station'} at ${b.start_time}`,
        time: 'Just now'
      });
    });

    if (logsList.length === 0) {
      logsList.push({
        icon: '📢',
        text: 'System online',
        details: 'Initial metrics mapped safely.',
        time: 'now'
      });
    }

    return logsList;
  }, [currentVenueBookings, currentVenueResources]);

  // Split target categories
  const activeSoftHolds = useMemo(() => {
    const todayStr = currentTime.toISOString().split('T')[0];
    return currentVenueBookings.filter(b => b.booking_date === todayStr && b.payment_method === 'pay_at_venue' && b.booking_status === 'held');
  }, [currentVenueBookings, currentTime]);

  // Hourly Matrix Schedule View data
  const gridTimelineMatrix = useMemo(() => {
    const hoursCount = 13; // 9:00 AM to 9:00 PM
    const hours = Array.from({ length: hoursCount }, (_, i) => {
      const hr = i + 9;
      return `${hr < 10 ? '0' : ''}${hr}:00`;
    });
    const todayStr = currentTime.toISOString().split('T')[0];

    return currentVenueResources.map(res => {
      const hourSlots = hours.map(hr => {
        const matchingSlot = slots.find(s => s.resource_id === res.id && s.slot_date === todayStr && s.start_time === hr);
        let color: 'green' | 'yellow' | 'blue' | 'red' | 'gray' = 'green';
        let detail = 'Available';
        let bookingId: string | null = null;

        if (matchingSlot) {
          if (matchingSlot.status === 'booked') {
            const b = bookings.find(x => x.id === matchingSlot.booking_id);
            if (b) {
              bookingId = b.id;
              if (b.booking_status === 'checked_in') {
                color = 'red';
                detail = `In Session: ${b.walk_in_customer_name || 'Checked In'}${b.walk_in_actual_start_time ? ` (${b.walk_in_actual_start_time}-${b.walk_in_actual_end_time})` : ''}`;
              } else {
                color = 'blue';
                detail = `Confirmed: ${b.walk_in_customer_name || 'Paid Client'}${b.walk_in_actual_start_time ? ` (${b.walk_in_actual_start_time}-${b.walk_in_actual_end_time})` : ''}`;
              }
            }
          } else if (matchingSlot.status === 'held') {
            const b = bookings.find(x => x.id === matchingSlot.booking_id);
            if (b) {
              bookingId = b.id;
              color = 'yellow';
              detail = `Soft Hold: ${b.walk_in_customer_name || 'Client'}`;
            }
          } else if (matchingSlot.status === 'blocked') {
            color = 'gray';
            detail = `Blocked: ${matchingSlot.blocked_reason || 'Maintenance'}`;
          }
        }

        return {
          hour: hr,
          color,
          detail,
          bookingId,
          resourceId: res.id,
          date: todayStr
        };
      });

      return {
        resource: res,
        columns: hourSlots
      };
    });
  }, [currentVenueResources, slots, bookings, currentTime]);

  // Modal actions handlers
  const handleConfirmCheckIn = () => {
    if (checkInConfirmBooking) {
      ownerCheckIn(checkInConfirmBooking.id);
      toast.success('Customer checked in successfully! Session is now actively locked.');
      setCheckInConfirmBooking(null);
    }
  };

  const handleConfirmExtend = () => {
    if (extendConfirmBooking) {
      ownerExtendHold(extendConfirmBooking.id);
      toast.success('Check-in window increased by 15 added minutes safely.');
      setExtendConfirmBooking(null);
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
      // Automatically prompt Walker
      onOpenWalkIn(payloadRef);
    }
  };

  const handleBlockGridCell = (cell: any) => {
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
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#12121A] p-6 rounded-2xl border border-border-dark">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white">{greetingText}</h2>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Running console trackers for <span className="text-white font-bold">{venue?.name || 'Your Arena'}</span> · {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {venue && !venue.is_verified && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-3 rounded-xl flex items-start gap-2 max-w-md animate-pulse">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-normal">
              <strong>⏳ Venue review pending verification.</strong> It will unlock live booking feeds globally within 24 hours. You can still set up station specifications immediately.
            </p>
          </div>
        )}
      </div>

      {/* TODAY COUNT STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block">Today's Bookings</span>
          <h3 className="text-3xl sm:text-4xl font-mono font-black mt-2 text-white">{stats.totalCount}</h3>
          <p className="text-[10px] text-text-secondary mt-1">
            Online: {stats.online} · Holds: {stats.holds} · Walk-ins: {stats.walkInCount}
          </p>
          <div className="absolute right-4 bottom-4 text-emerald-400 font-mono text-[10px] font-bold bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10">
            ↑ 3 more than yesterday
          </div>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block">Today's Revenue (Gross)</span>
          <h3 className="text-3xl sm:text-4xl font-mono font-black mt-2 text-white">₹{stats.gross}</h3>
          <p className="text-[10px] text-emerald-400 mt-1 font-bold">
            Net: ₹{stats.net} (after 10% commission fee)
          </p>
          <div className="absolute right-4 bottom-4 text-brand-purple font-mono text-[10px] font-bold bg-brand-purple/5 px-2 py-0.5 rounded border border-brand-purple/10">
            Gross track
          </div>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block">This Month Net Earnings</span>
          <h3 className="text-3xl sm:text-4xl font-mono font-black mt-2 text-white">₹{stats.monthlyNet}</h3>
          <p className="text-[10px] text-emerald-400 mt-1 font-mono">
            ↑ 12% vs last calendar month
          </p>
        </div>

        <div className="bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary block">Slot Occupancy Today</span>
            <div className="text-2xl font-mono font-black text-white">{stats.occupancyPercent}%</div>
            <p className="text-[9px] text-text-secondary">
              {stats.filledSlotsCount} of {stats.maxActiveHourSlots} hour blocks filled
            </p>
          </div>
          {/* Circular ring simulator */}
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

      {/* SOFT HOLDS LIST PANEL (⚠️ CRITICAL) */}
      <div className="bg-yellow-500/5 p-6 rounded-2xl border border-yellow-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2 border-b border-yellow-500/10">
          <div>
            <h4 className="font-bold text-base text-yellow-500 font-display flex items-center gap-1.5">
              <ShieldAlert className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span>⚠️ Soft Holds - Pay at Venue Live Countdown</span>
            </h4>
            <p className="text-xs text-text-secondary leading-normal max-w-xl">
              Clients selected Pay-at-Venue. Countdown begins at slot start times with a strict 15 minute grace window. If clients do not check-in ahead of timeout, recycling triggers release instantly.
            </p>
          </div>
          <div className="text-[10px] font-mono text-yellow-500/70 uppercase">
            Auto updates: 30s rate
          </div>
        </div>

        {activeSoftHolds.length === 0 ? (
          <div className="bg-emerald-500/5 p-5 border border-emerald-500/15 rounded-xl text-center flex flex-col items-center justify-center space-y-1">
            <span className="text-xl">🏆</span>
            <p className="text-xs font-bold text-emerald-400">All clear! No pending soft holds currently active.</p>
            <p className="text-[10px] text-text-secondary font-mono">Your stations are fully locked or fully free.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSoftHolds.map(b => (
              <SoftHoldCard 
                key={b.id} 
                booking={b} 
                currentTime={currentTime}
                resourceName={currentVenueResources.find(r => r.id === b.resource_id)?.name || 'PC Gaming Rig'}
                onCheckIn={() => setCheckInConfirmBooking(b)}
                onExtend={() => setExtendConfirmBooking(b)}
                onRelease={() => setReleaseConfirmBooking(b)}
              />
            ))}
          </div>
        )}
      </div>

      {/* VISUAL HOURLY BLOCK TIMELINE */}
      <div className="bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border-dark">
          <div>
            <h4 className="font-bold font-display text-white text-base">Visual Schedule Timeline (Today's Hour Blocks)</h4>
            <p className="text-xs text-text-secondary">Click any available green slot to block it manually as Offline/Maintenance.</p>
          </div>
          <div className="flex gap-4 text-[10px] text-text-secondary font-mono">
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-emerald-400 rounded-full"></span> Available</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-yellow-500 rounded-full"></span> Soft Hold</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-[#7C3AED] rounded-full"></span> Confirmed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-red-500 rounded-full"></span> Checked In</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-gray-600 rounded-full"></span> Blocked</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-secondary">
            <thead>
              <tr className="border-b border-[#2A2A3E]">
                <th className="py-2.5 px-3 min-w-[120px] font-bold text-white uppercase font-mono">Station Rig</th>
                {Array.from({ length: 13 }, (_, i) => {
                  const hour = i + 9;
                  return (
                    <th key={hour} className="py-2.5 px-1 text-center font-mono text-[10px]">
                      {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
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
                      col.color === 'green'
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

      {/* BOTTOM FEED - RECENTS TABLE & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT BOOKINGS */}
        <div className="lg:col-span-7 bg-[#1A1A2E] border border-border-dark p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-border-dark pb-2">
            <h4 className="font-bold font-display text-white text-base">Recent Activity Bookings</h4>
            <span className="text-[10px] font-mono text-text-secondary">Last 5 units</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-text-secondary border-b border-border-dark">
                  <th className="py-2">Reference</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Station</th>
                  <th className="py-2">Slot</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C2D]">
                {currentVenueBookings.slice(-5).reverse().map(b => (
                  <tr key={b.id} className="text-white">
                    <td className="py-3 font-mono text-text-secondary text-[11px] font-bold">{b.booking_ref}</td>
                    <td className="py-3 font-semibold">
                      {b.walk_in_customer_name || 'Logged User'}
                    </td>
                    <td className="py-3 text-text-secondary">
                      {currentVenueResources.find(r => r.id === b.resource_id)?.name || 'Default Rig'}
                    </td>
                    <td className="py-3 font-mono text-xs">
                      {b.walk_in_actual_start_time ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold">{b.walk_in_actual_start_time} - {b.walk_in_actual_end_time}</span>
                          <span className="text-[9px] text-text-secondary/60">({b.start_time} block)</span>
                        </div>
                      ) : (
                        <span>{b.start_time}</span>
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

      {/* EXTEND CONFIRM POPUP */}
      {extendConfirmBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-51 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-yellow-500/20 p-6 rounded-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-yellow-500/10 text-yellow-500 rounded-full">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold font-display text-white text-lg">Extend Hold Window (+15m)?</h4>
              <p className="text-xs text-text-secondary mt-1">
                This adds 15 extra minutes to their check-in margin. You can only extend a reservation hold once.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setExtendConfirmBooking(null)}
                className="w-1/2 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExtend}
                className="w-1/2 py-2.5 bg-yellow-500 hover:bg-yellow-600 rounded-xl text-xs font-bold uppercase text-black cursor-pointer"
              >
                Yes, Extend
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
                This will immediately cancel their hold booking (GARF Client notified). You can then assign this slot immediately to a walk-in client.
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

// MULTI-ROLLER SOFT HOLD CARD COMPONENT WITH REVIEWS TRACKER
interface SoftHoldCardProps {
  booking: Booking;
  currentTime: Date;
  resourceName: string;
  onCheckIn: () => void;
  onExtend: () => void;
  onRelease: () => void;
}

const SoftHoldCard: React.FC<SoftHoldCardProps> = ({ 
  booking, currentTime, resourceName, onCheckIn, onExtend, onRelease 
}) => {
  const { profiles, ownerReleaseSlot } = useApp();

  const customerProfile = useMemo(() => {
    return profiles.find(p => p.id === booking.customer_id);
  }, [profiles, booking]);

  const startsTimeDate = useMemo(() => {
    return new Date(`${booking.booking_date}T${booking.start_time}:00`);
  }, [booking]);

  // Expiration boundary check
  const expiryTimeDate = useMemo(() => {
    if (booking.hold_expires_at) {
      return new Date(booking.hold_expires_at);
    }
    // Default 15 minutes after start time
    return new Date(startsTimeDate.getTime() + 15 * 60 * 1000);
  }, [booking, startsTimeDate]);

  const hasExpired = currentTime.getTime() > expiryTimeDate.getTime();
  const startsActive = currentTime.getTime() >= startsTimeDate.getTime();

  // Active Seconds Countdown
  const secondsRemaining = useMemo(() => {
    if (!startsActive) return 900; // 15 mins preset
    return Math.max(0, Math.floor((expiryTimeDate.getTime() - currentTime.getTime()) / 1000));
  }, [startsActive, expiryTimeDate, currentTime]);

  const countdownText = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [secondsRemaining]);

  // Auto-expire trigger
  useEffect(() => {
    if (startsActive && hasExpired) {
      ownerReleaseSlot(booking.id);
      toast.error(`Released expired soft hold for PC ${booking.booking_ref}! Slot recycled.`, { id: `auto-expire-${booking.id}` });
    }
  }, [startsActive, hasExpired, booking.id, ownerReleaseSlot]);

  // Extension status
  const alreadyExtended = useMemo(() => {
    const defaultExpiry = startsTimeDate.getTime() + 15 * 60 * 1000;
    return expiryTimeDate.getTime() > defaultExpiry;
  }, [startsTimeDate, expiryTimeDate]);

  return (
    <div className={`p-4.5 rounded-xl border flex flex-col justify-between transition gap-3 shadow-md ${
      hasExpired 
        ? 'border-red-500/30 bg-red-500/5 opacity-55 saturate-50' 
        : startsActive && secondsRemaining < 300
          ? 'border-red-500 bg-red-950/20 shadow-red-900/10 animate-pulse'
          : 'border-yellow-500/25 bg-[#12121A]/80 hover:border-yellow-500/40'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[11px] font-mono text-yellow-500 font-bold bg-yellow-500/10 px-2.5 py-0.5 rounded border border-yellow-500/20">
            {booking.booking_ref}
          </span>
          <h5 className="font-bold text-white text-base mt-2 font-display">
            {booking.walk_in_customer_name || customerProfile?.full_name || 'Client'}
          </h5>
          <p className="text-[10px] text-text-secondary font-mono mt-0.5">
            {resourceName} · {booking.walk_in_actual_start_time ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ⏱️ Custom: {booking.walk_in_actual_start_time} - {booking.walk_in_actual_end_time}
              </span>
            ) : (
              <span>{booking.start_time} - {booking.end_time} ({booking.duration_hours}h)</span>
            )}
          </p>
        </div>

        {/* Live Active Clock States */}
        <div className="text-right">
          {!startsActive ? (
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[#a8a8cf] bg-[#1a1c32] px-2 py-0.5 rounded border border-[#2a2c4e] uppercase font-mono">Starts {booking.start_time}</span>
              <p className="text-[9px] text-text-secondary/60 font-mono mt-1">Timer begins on slot hour</p>
            </div>
          ) : hasExpired ? (
            <span className="text-xs font-mono font-black text-red-400 block tracking-widest uppercase">EXPIRED</span>
          ) : (
            <div className="text-right space-y-0.5">
              <span className={`text-base font-mono font-black tracking-widest block leading-none ${secondsRemaining < 300 ? 'text-red-400' : 'text-yellow-400'}`}>
                {countdownText}
              </span>
              <span className="text-[8px] uppercase font-mono tracking-wider font-bold text-text-secondary/50 block">Arrive check window</span>
            </div>
          )}
        </div>
      </div>

      {customerProfile?.no_show_count && customerProfile.no_show_count > 0 ? (
        <div className="text-[10px] text-red-400 font-bold bg-red-400/5 p-1 px-2 border border-red-400/10 rounded font-mono">
          🚨 warning: client possesses {customerProfile.no_show_count}/3 missed check-in no-show marks.
        </div>
      ) : null}

      <div className="flex gap-2 pt-2 border-t border-border-dark/40">
        <button
          onClick={onCheckIn}
          disabled={hasExpired}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold text-black font-sans flex-1 transition cursor-pointer flex justify-center items-center gap-1 bg-emerald-400 hover:bg-emerald-500 disabled:opacity-40`}
        >
          <span>Check In</span>
        </button>

        <button
          onClick={onExtend}
          disabled={alreadyExtended || hasExpired || !startsActive}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans flex-1 transition flex justify-center items-center border ${
            alreadyExtended 
              ? 'border-text-secondary/20 text-text-secondary/40 cursor-not-allowed bg-black/10' 
              : 'border-yellow-500/20 hover:border-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-500 cursor-pointer'
          }`}
        >
          <span>Extend hold</span>
        </button>

        <button
          onClick={onRelease}
          className="p-1 px-2 rounded-lg text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 bg-red-500/5 transition cursor-pointer"
          title="Release hold for walk-in client"
        >
          Release
        </button>
      </div>

    </div>
  );
};
