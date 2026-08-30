import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Check, Loader2, Info, AlertTriangle, Clock, Play, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { timeToMinutes, minutesToTime, addMinutesToTime, formatTimeDisplay } from '../../lib/availability';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSlot?: { resourceId: string; date: string; hour: string } | null;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, preselectedSlot }) => {
  const { resources, slots, bookings, addWalkInBooking, ownerReleaseSlot, venues, checkUnitAvailability } = useApp();

  const [step, setStep] = useState(1);
  const [selectedResourceId, setSelectedResourceId] = useState(preselectedSlot?.resourceId || '');
  const [selectedDate, setSelectedDate] = useState(preselectedSlot?.date || new Date().toISOString().split('T')[0]);

  // Current clock time formatted as HH:MM
  const getCurrentTimeFormatted = () => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Start time states
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [customStartTime, setCustomStartTime] = useState(() => {
    if (preselectedSlot?.hour) return preselectedSlot.hour;
    return getCurrentTimeFormatted();
  });

  // Duration in minutes (e.g. 60 = 1 hr, 90 = 1.5 hr, 120 = 2 hr)
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');

  // Step 2 Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customAmount, setCustomAmount] = useState<number | ''>('');
  const [paymentBy, setPaymentBy] = useState<'Cash' | 'UPI'>('Cash');
  const [notes, setNotes] = useState('');

  const [showSoftHoldWarning, setShowSoftHoldWarning] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected Resource
  const selectedResource = useMemo(() => {
    return resources.find(r => r.id === selectedResourceId) || null;
  }, [selectedResourceId, resources]);

  // Handle preselected slot or default resource
  useEffect(() => {
    if (preselectedSlot) {
      setSelectedResourceId(preselectedSlot.resourceId);
      setSelectedDate(preselectedSlot.date);
      setCustomStartTime(preselectedSlot.hour);
      setUseCurrentTime(false);
    } else if (!selectedResourceId && resources.length > 0) {
      setSelectedResourceId(resources[0].id);
    }
  }, [preselectedSlot, resources, selectedResourceId]);

  const isDayClosed = useMemo(() => {
    const res = selectedResource || resources[0];
    if (!res) return false;
    const v = venues.find(x => x.id === res.venue_id);
    return v?.closed_dates?.includes(selectedDate) || false;
  }, [selectedResource, resources, venues, selectedDate]);

  // Actual Effective Start Time
  const actualStartTime = useMemo(() => {
    return customStartTime || '09:00';
  }, [customStartTime]);

  // Actual Effective End Time
  const actualEndTime = useMemo(() => {
    return addMinutesToTime(actualStartTime, durationMinutes);
  }, [actualStartTime, durationMinutes]);

  // Calculate pricing based on exact minutes
  const durationHours = durationMinutes / 60;
  const standardPrice = useMemo(() => {
    if (!selectedResource) return 0;
    return Math.round(selectedResource.price_per_hour * durationHours);
  }, [selectedResource, durationHours]);

  const finalPrice = customAmount === '' ? standardPrice : customAmount;

  // Real-time Availability & Conflict Check for the specified time interval
  const availabilityCheck = useMemo(() => {
    if (!selectedResourceId || !selectedDate || !actualStartTime || !actualEndTime) {
      return { available: true };
    }
    return checkUnitAvailability(selectedResourceId, selectedDate, actualStartTime, actualEndTime);
  }, [selectedResourceId, selectedDate, actualStartTime, actualEndTime, checkUnitAvailability]);

  // Find max free minutes from start time if conflict exists
  const maxFreeMinsBeforeConflict = useMemo(() => {
    if (availabilityCheck.available || !selectedResourceId) return durationMinutes;
    
    const startMins = timeToMinutes(actualStartTime);
    // Find all future bookings for this unit on this date starting after startMins
    const futureBookings = bookings
      .filter(b => b.resource_id === selectedResourceId && b.booking_date === selectedDate && b.booking_status !== 'cancelled' && b.booking_status !== 'no_show')
      .map(b => {
        const bStart = b.walk_in_actual_start_time || b.start_time;
        return timeToMinutes(bStart);
      })
      .filter(m => m > startMins)
      .sort((a, b) => a - b);

    if (futureBookings.length > 0) {
      return Math.max(0, futureBookings[0] - startMins);
    }
    return 0;
  }, [availabilityCheck, selectedResourceId, selectedDate, actualStartTime, bookings, durationMinutes]);

  // Other alternative units of the same type that are available
  const alternateAvailableUnits = useMemo(() => {
    if (availabilityCheck.available || !selectedResource) return [];
    return resources.filter(r => 
      r.venue_id === selectedResource.venue_id && 
      r.type === selectedResource.type && 
      r.id !== selectedResource.id &&
      r.is_active !== false &&
      checkUnitAvailability(r.id, selectedDate, actualStartTime, actualEndTime).available
    );
  }, [availabilityCheck, selectedResource, resources, selectedDate, actualStartTime, actualEndTime, checkUnitAvailability]);

  if (!isOpen) return null;

  const handleSetNow = () => {
    setUseCurrentTime(true);
    setCustomStartTime(getCurrentTimeFormatted());
  };

  const handleDurationPreset = (mins: number) => {
    setDurationMinutes(mins);
    setCustomMinutesInput('');
  };

  const handleCustomMinutesChange = (val: string) => {
    setCustomMinutesInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setDurationMinutes(num);
    }
  };

  const handleAutoAdjustToMax = () => {
    if (maxFreeMinsBeforeConflict > 0) {
      setDurationMinutes(maxFreeMinsBeforeConflict);
      setCustomMinutesInput('');
      toast.success(`Duration adjusted to ${maxFreeMinsBeforeConflict} minutes`);
    }
  };

  const executeAddWalkIn = async () => {
    setSubmitting(true);
    try {
      if (!actualStartTime || !selectedResourceId) {
        toast.error('Please assign a station rig and start time');
        setSubmitting(false);
        return;
      }

      if (!availabilityCheck.available) {
        toast.error(availabilityCheck.conflictingReason || 'Time interval conflicts with an existing booking');
        setSubmitting(false);
        return;
      }

      // Generate sequence of hourly slot identifiers for legacy tracking
      const startH = parseInt(actualStartTime.split(':')[0], 10);
      const endH = Math.ceil(timeToMinutes(actualEndTime) / 60);
      const generatedSlots: string[] = [];
      for (let h = startH; h < endH; h++) {
        generatedSlots.push(`${h.toString().padStart(2, '0')}:00`);
      }

      await addWalkInBooking({
        resourceId: selectedResourceId,
        date: selectedDate,
        slots: generatedSlots.length > 0 ? generatedSlots : [`${startH.toString().padStart(2, '0')}:00`],
        customerName: customerName || 'Walk-in Player',
        customerPhone: customerPhone || undefined,
        pricePerHr: customAmount !== '' ? Number(customAmount) / durationHours : undefined,
        paymentBy,
        actualStartTime: actualStartTime,
        actualEndTime: actualEndTime
      });

      toast.success(`Walk-in confirmed! Rig locked for ${formatTimeDisplay(actualStartTime)} → ${formatTimeDisplay(actualEndTime)} 🎮`);
      
      // Reset state and exit
      setStep(1);
      setCustomerName('');
      setCustomerPhone('');
      setCustomAmount('');
      setNotes('');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error executing walk-in session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-[#1A1A2E] border border-[#2a2a3e] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#12121A] px-6 py-4 border-b border-[#2a2a3e]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🚶</span>
            <div>
              <h3 className="font-bold font-display text-white text-lg">
                Add Walk-In / Live Session
              </h3>
              <p className="text-text-secondary text-[11px] font-mono">
                Start session at any minute with real-time interval conflict checking
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-[#1C1C2D] rounded-lg text-text-secondary hover:text-white cursor-pointer transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {step === 1 ? (
            <div className="space-y-5">
              
              {isDayClosed && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>This date is marked as <strong className="font-bold">CLOSED</strong> in Venue Settings. No walk-ins can be started today.</span>
                </div>
              )}

              {/* 1. Target Rig & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5 font-bold">
                    1. Station / Rig
                  </label>
                  <select
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple cursor-pointer"
                    value={selectedResourceId}
                    onChange={e => setSelectedResourceId(e.target.value)}
                  >
                    <option value="">Select station rig...</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type.toUpperCase()}) — ₹{r.price_per_hour}/hr
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5 font-bold">
                    2. Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-[#12121A] font-mono border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* 2. Start Time Selector */}
              <div className="bg-[#12121A] p-4.5 rounded-xl border border-border-dark space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider text-text-secondary font-mono font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-brand-purple" />
                    <span>3. Actual Start Time</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleSetNow}
                    className="px-3 py-1 bg-brand-purple/15 border border-brand-purple/30 hover:bg-brand-purple/25 text-brand-purple rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Zap className="h-3 w-3" />
                    <span>Start Right Now ({getCurrentTimeFormatted()})</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={e => {
                      setCustomStartTime(e.target.value);
                      setUseCurrentTime(false);
                    }}
                    className="bg-[#1A1A2E] border border-[#2a2a3e] rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white focus:border-brand-purple outline-none"
                  />
                  <span className="text-xs text-text-secondary font-mono">
                    Formatted: <strong className="text-white">{formatTimeDisplay(actualStartTime)}</strong>
                  </span>
                </div>
              </div>

              {/* 3. Duration Selector */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">
                    4. Play Duration
                  </label>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {durationMinutes} minutes ({durationHours} hr{durationHours !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: '30m', mins: 30 },
                    { label: '45m', mins: 45 },
                    { label: '1h', mins: 60 },
                    { label: '1.5h', mins: 90 },
                    { label: '2h', mins: 120 },
                    { label: '3h', mins: 180 },
                  ].map(p => (
                    <button
                      key={p.mins}
                      type="button"
                      onClick={() => handleDurationPreset(p.mins)}
                      className={`py-2 px-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer text-center ${
                        durationMinutes === p.mins && !customMinutesInput
                          ? 'bg-brand-purple border-brand-purple text-white shadow-md shadow-brand-purple/20'
                          : 'bg-[#12121A] border-[#2a2a3e] text-text-secondary hover:text-white hover:border-brand-purple/40'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Minutes Input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-text-secondary font-mono">Or custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    placeholder="e.g. 75"
                    value={customMinutesInput}
                    onChange={e => handleCustomMinutesChange(e.target.value)}
                    className="w-24 bg-[#12121A] border border-[#2a2a3e] rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none focus:border-brand-purple"
                  />
                  <span className="text-xs text-text-secondary font-mono">minutes</span>
                </div>
              </div>

              {/* 4. Live Session Timeline & Conflict Status Badge */}
              <div className={`p-4 rounded-xl border space-y-2.5 transition ${
                !availabilityCheck.available
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-white'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-text-secondary font-bold">
                    Target Session Interval
                  </span>
                  <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                    !availabilityCheck.available
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {availabilityCheck.available ? '🟢 UNIT AVAILABLE' : '🔴 TIME CONFLICT'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm sm:text-base font-mono font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{formatTimeDisplay(actualStartTime)}</span>
                    <span className="text-text-secondary">➔</span>
                    <span className="text-white">{formatTimeDisplay(actualEndTime)}</span>
                  </div>
                  <span className="text-emerald-400 text-xs sm:text-sm">
                    Est. ₹{standardPrice}
                  </span>
                </div>

                {/* Conflict Details and Quick Auto-Fix */}
                {!availabilityCheck.available && (
                  <div className="pt-2 border-t border-red-500/20 space-y-2">
                    <p className="text-xs text-red-300 font-sans leading-relaxed">
                      ⚠️ {availabilityCheck.conflictingReason}
                    </p>
                    
                    {maxFreeMinsBeforeConflict > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoAdjustToMax}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-mono font-bold text-red-200 flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>⚡ Auto-adjust duration to {maxFreeMinsBeforeConflict} mins (Ends at conflict)</span>
                      </button>
                    )}

                    {alternateAvailableUnits.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-text-secondary font-mono block mb-1">
                          Other available {selectedResource?.type.toUpperCase()} units right now:
                        </span>
                        <div className="flex gap-2 flex-wrap">
                          {alternateAvailableUnits.map(alt => (
                            <button
                              key={alt.id}
                              type="button"
                              onClick={() => setSelectedResourceId(alt.id)}
                              className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-lg text-xs font-mono text-emerald-300 cursor-pointer transition"
                            >
                              👉 Switch to {alt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Step 1 Action */}
              <div className="pt-4 border-t border-[#2a2a3e] flex justify-end">
                <button
                  type="button"
                  disabled={!selectedResourceId || !availabilityCheck.available || isDayClosed}
                  onClick={() => setStep(2)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                    selectedResourceId && availabilityCheck.available && !isDayClosed
                      ? 'btn-gradient text-white cursor-pointer shadow-lg shadow-brand-purple/20'
                      : 'bg-[#12121A] text-text-secondary border border-[#2a2a3e] cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>Continue to Billing</span>
                  <span>→</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Summary Header */}
              <div className="p-3 bg-[#12121A] rounded-xl border border-border-dark flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-text-secondary">Station: </span>
                  <strong className="text-white">{selectedResource?.name}</strong>
                </div>
                <div>
                  <span className="text-text-secondary">Timing: </span>
                  <strong className="text-emerald-400">{formatTimeDisplay(actualStartTime)} - {formatTimeDisplay(actualEndTime)} ({durationHours}h)</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                    Player Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple font-mono"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    placeholder={`Standard: ₹${standardPrice}`}
                    className="w-full bg-[#12121A] font-mono border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1 font-bold">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentBy('Cash')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                        paymentBy === 'Cash' 
                          ? 'border-brand-purple bg-brand-purple/15 text-white' 
                          : 'border-[#2a2a3e] bg-[#12121A] text-text-secondary'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentBy('UPI')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                        paymentBy === 'UPI' 
                          ? 'border-brand-purple bg-brand-purple/15 text-white' 
                          : 'border-[#2a2a3e] bg-[#12121A] text-[#a8a8cf]'
                      }`}
                    >
                      📱 Local UPI
                    </button>
                  </div>
                </div>
              </div>

              {customAmount !== '' && Number(customAmount) !== standardPrice && (
                <div className="p-2.5 bg-[#12121A] border border-border-dark rounded-xl flex justify-between font-mono text-[11px]">
                  <span className="text-text-secondary">Standard Rate: ₹{standardPrice}</span>
                  <span className="text-yellow-400 font-bold">
                    Custom Rate: ₹{customAmount} ({Number(customAmount) < standardPrice ? `Discount ₹${standardPrice - Number(customAmount)}` : `Surplus ₹${Number(customAmount) - standardPrice}`})
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular client, paid advance, etc."
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-xl p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-6 border-t border-[#2a2a3e] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-xl text-xs font-bold uppercase text-text-secondary hover:text-white cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={executeAddWalkIn}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 btn-gradient text-white shadow-lg shadow-brand-purple/20 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Locking Rig...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Session — ₹{finalPrice}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
