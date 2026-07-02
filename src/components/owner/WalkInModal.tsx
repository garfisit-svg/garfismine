import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Check, Loader2, Info, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSlot?: { resourceId: string; date: string; hour: string } | null;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, preselectedSlot }) => {
  const { resources, slots, bookings, addWalkInBooking, ownerReleaseSlot, venues } = useApp();

  const [step, setStep] = useState(1);
  const [selectedResourceId, setSelectedResourceId] = useState(preselectedSlot?.resourceId || '');
  const [selectedDate, setSelectedDate] = useState(preselectedSlot?.date || new Date().toISOString().split('T')[0]);
  const [selectedStartTime, setSelectedStartTime] = useState(preselectedSlot?.hour || '');
  const [duration, setDuration] = useState(1);
  const [minuteOffset, setMinuteOffset] = useState('00'); // support custom 11:15 etc.
  
  // Step 2 Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customAmount, setCustomAmount] = useState<number | ''>('');
  const [paymentBy, setPaymentBy] = useState<'Cash' | 'UPI'>('Cash');
  const [notes, setNotes] = useState('');

  const actualStartTimeString = useMemo(() => {
    if (!selectedStartTime) return '';
    const [h] = selectedStartTime.split(':');
    return `${h}:${minuteOffset}`;
  }, [selectedStartTime, minuteOffset]);

  const actualEndTimeString = useMemo(() => {
    if (!selectedStartTime) return '';
    const [h] = selectedStartTime.split(':');
    const endH = Number(h) + duration;
    const endHStr = endH < 10 ? `0${endH}` : `${endH}`;
    return `${endHStr}:${minuteOffset}`;
  }, [selectedStartTime, duration, minuteOffset]);
  
  const [showSoftHoldWarning, setShowSoftHoldWarning] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-selection update
  React.useEffect(() => {
    if (preselectedSlot) {
      setSelectedResourceId(preselectedSlot.resourceId);
      setSelectedDate(preselectedSlot.date);
      setSelectedStartTime(preselectedSlot.hour);
    }
  }, [preselectedSlot]);

  const selectedResource = useMemo(() => {
    return resources.find(r => r.id === selectedResourceId) || null;
  }, [selectedResourceId, resources]);

  const isDayClosed = useMemo(() => {
    const res = selectedResource || resources[0];
    if (!res) return false;
    const v = venues.find(x => x.id === res.venue_id);
    return v?.closed_dates?.includes(selectedDate) || false;
  }, [selectedResource, resources, venues, selectedDate]);

  // Compute 24-hourly blocks status
  const hourlySlotsStatus = useMemo(() => {
    if (!selectedResourceId) return [];
    
    const times = Array.from({ length: 15 }, (_, i) => {
      const hourVal = i + 9; // 9:00 AM to 11:00 PM
      return `${hourVal < 10 ? '0' : ''}${hourVal}:00`;
    });

    return times.map(t => {
      const dbSlot = slots.find(s => s.resource_id === selectedResourceId && s.slot_date === selectedDate && s.start_time === t);
      
      let status: 'available' | 'booked' | 'held' | 'blocked' = 'available';
      let bookingRef: string | null = null;
      let customerNameStr: string = '';
      let bookingId: string | null = null;

      if (isDayClosed) {
        status = 'blocked';
      } else if (dbSlot) {
        status = dbSlot.status;
        if (dbSlot.booking_id) {
          bookingId = dbSlot.booking_id;
          const associatedB = bookings.find(b => b.id === dbSlot.booking_id);
          if (associatedB) {
            bookingRef = associatedB.booking_ref;
            customerNameStr = associatedB.walk_in_customer_name || 'Customer Profile';
          }
        }
      }

      return {
        time: t,
        status,
        bookingId,
        bookingRef,
        customerNameStr
      };
    });
  }, [selectedResourceId, selectedDate, slots, bookings, isDayClosed]);

  // Pricing details
  const standardPrice = useMemo(() => {
    if (!selectedResource) return 0;
    return selectedResource.price_per_hour * duration;
  }, [selectedResource, duration]);

  const finalPrice = customAmount === '' ? standardPrice : customAmount;

  if (!isOpen) return null;

  const handleSlotCellClick = (cell: any) => {
    if (isDayClosed) {
      toast.error('Venue is closed on this date (Configured in Settings)');
      return;
    }
    if (cell.status === 'booked' || cell.status === 'blocked') {
      toast.error('This slot is locked and unavailable for walk-ins');
      return;
    }
    if (cell.status === 'held') {
      // Trigger warning of overriding a soft-hold client
      setShowSoftHoldWarning(cell);
      return;
    }
    setSelectedStartTime(cell.time);
  };

  const confirmSoftHoldOverride = () => {
    if (showSoftHoldWarning) {
      setSelectedStartTime(showSoftHoldWarning.time);
      setShowSoftHoldWarning(null);
      toast.success('Soft hold overridden. Add walk-in here.');
    }
  };

  const executeAddWalkIn = async () => {
    setSubmitting(true);
    try {
      if (!selectedStartTime || !selectedResourceId) {
        toast.error('Please assign a resource and clock time');
        setSubmitting(false);
        return;
      }

      // Generate sequence of slots based on duration
      const [startH, startM] = selectedStartTime.split(':').map(Number);
      const generatedSlots: string[] = [];
      for (let i = 0; i < duration; i++) {
        const nextH = startH + i;
        generatedSlots.push(`${nextH < 10 ? '0' : ''}${nextH}:00`);
      }

      // Identify if overriding any soft holds
      const slotsOverridden = hourlySlotsStatus.filter(cs => generatedSlots.includes(cs.time) && cs.status === 'held');
      for (const overrideCell of slotsOverridden) {
        if (overrideCell.bookingId) {
          await ownerReleaseSlot(overrideCell.bookingId);
        }
      }

      await addWalkInBooking({
        resourceId: selectedResourceId,
        date: selectedDate,
        slots: generatedSlots,
        customerName: customerName || 'Anonymous',
        customerPhone: customerPhone || undefined,
        pricePerHr: customAmount !== '' ? Number(customAmount) / duration : undefined,
        paymentBy,
        actualStartTime: actualStartTimeString,
        actualEndTime: actualEndTimeString
      });

      toast.success('Walk-in registered! Slot hard locked 🟢');
      
      // Reset state and exit
      setStep(1);
      setSelectedStartTime('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomAmount('');
      setNotes('');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error executing walk-in lock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="w-full max-w-2xl bg-[#1A1A2E] border border-[#2a2a3e] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#12121A] px-6 py-4 border-b border-[#2a2a3e]">
          <h3 className="font-bold font-display text-white text-lg flex items-center gap-2">
            <span>➕ Add Walk-In Live Session</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-[#1C1C2D] rounded text-text-secondary hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              {isDayClosed && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>This date is configured as <strong className="font-bold">CLOSED</strong> in Venue Settings. No walk-ins can be registered on closed dates.</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5">1. Target Resource</label>
                  <select
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={selectedResourceId}
                    onChange={e => setSelectedResourceId(e.target.value)}
                  >
                    <option value="">Select computer/turf rig...</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type.toUpperCase()}) - ₹{r.price_per_hour}/hr
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5">2. Booking Date</label>
                  <input
                    type="date"
                    className="w-full bg-[#12121A] font-mono border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              {selectedResourceId ? (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-2">3. Start Slot (Select clock time block)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {hourlySlotsStatus.map(cell => (
                      <button
                        key={cell.time}
                        onClick={() => handleSlotCellClick(cell)}
                        type="button"
                        className={`p-2.5 text-center text-xs font-semibold rounded-lg border transition duration-150-all cursor-pointer flex flex-col items-center justify-center ${
                          selectedStartTime === cell.time
                            ? 'border-brand-purple bg-brand-purple/20 text-white shadow-md'
                            : cell.status === 'booked'
                              ? 'border-brand-cyan/20 bg-brand-cyan/5 text-brand-cyan/60 line-through'
                              : cell.status === 'blocked'
                                ? 'border-[#383856] bg-black/30 text-text-secondary/50'
                                : cell.status === 'held'
                                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500 animate-pulse'
                                  : 'border-[#2a2a3e] bg-[#12121A] text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/10'
                        }`}
                      >
                        <span className="font-mono">{cell.time}</span>
                        {cell.status === 'held' && <span className="text-[8px] font-mono font-bold">HOLD</span>}
                        {cell.status === 'booked' && <span className="text-[8px] font-mono">LOCKED</span>}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-1.5 text-[10px] text-text-secondary font-mono justify-center">
                    <span className="flex items-center gap-1">🟢 Available</span>
                    <span className="flex items-center gap-1">🟡 Soft Hold</span>
                    <span className="flex items-center gap-1">🔵 Confirmed</span>
                    <span className="flex items-center gap-1">⚫ Blocked</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-text-secondary bg-[#12121A] rounded-xl border border-dashed border-[#2a2a3e]">
                  💡 select a computer rig or console station above to load day-specific available slots
                </div>
              )}

              {selectedStartTime && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono mb-1.5">4. Duration Hours</label>
                    <select
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple font-mono"
                      value={duration}
                      onChange={e => setDuration(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map(hr => {
                        const startHour = Number(selectedStartTime.split(':')[0]);
                        const endHour = startHour + hr;
                        return (
                          <option key={hr} value={hr}>
                            {hr} Hour{hr > 1 ? 's' : ''} (Ends at {endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* PRECISE TIMING ADJUSTER SECTION */}
                  <div className="bg-[#12121A] p-4 rounded-xl border border-brand-purple/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⏱️</span>
                      <div>
                        <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">Custom Walk-In Minute Offset</h4>
                        <p className="text-[10px] text-text-secondary">If the player starts playing mid-hour (e.g. 11:15 AM)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {['00', '15', '30', '45'].map(min => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setMinuteOffset(min)}
                          className={`py-2 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                            minuteOffset === min 
                              ? 'border-brand-purple bg-brand-purple/15 text-white glow-purple' 
                              : 'border-[#2a2a3e] bg-[#161626] text-text-secondary hover:text-white hover:border-[#3a3a56]'
                          }`}
                        >
                          :{min}
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#1C1C2D] p-3 rounded-lg border border-border-dark flex justify-between items-center">
                      <div>
                        <span className="text-[9px] uppercase font-mono text-text-secondary block">LIVE SESSION TIMELINE</span>
                        <div className="text-xs text-white mt-0.5">
                          <span className="text-emerald-400 font-mono font-bold">{actualStartTimeString}</span>
                          <span className="mx-2 text-text-secondary/60 font-mono">➔</span>
                          <span className="text-emerald-400 font-mono font-bold">{actualEndTimeString}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-mono text-text-secondary block">SLOT ALLOCATION LOCK</span>
                        <span className="text-[10px] font-mono text-text-secondary bg-[#12121A] px-2 py-0.5 rounded border border-[#2a2a3e] mt-1 inline-block">
                          {selectedStartTime} - {Number(selectedStartTime.split(':')[0]) + duration}:00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[#2a2a3e] flex justify-end">
                <button
                  type="button"
                  disabled={!selectedStartTime}
                  onClick={() => setStep(2)}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition ${selectedStartTime ? 'btn-gradient text-white cursor-pointer' : 'bg-[#12121A] text-text-secondary border border-[#2a2a3e] cursor-not-allowed'}`}
                >
                  <span>Continue</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="anonymous walk-in"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple font-mono"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Base Rate Collected (₹)</label>
                  <input
                    type="number"
                    placeholder={`Preset: ₹${standardPrice}`}
                    className="w-full bg-[#12121A] font-mono border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-text-secondary mb-1.5 font-bold">Operational Mode Payment</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentBy('Cash')}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition ${paymentBy === 'Cash' ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-[#2a2a3e] text-text-secondary'}`}
                    >
                      💵 Cash collected
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentBy('UPI')}
                      className={`py-2 text-xs font-bold rounded-lg border text-center transition ${paymentBy === 'UPI' ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-[#2a2a3e] text-[#a8a8cf]'}`}
                    >
                      📱 Local UPI
                    </button>
                  </div>
                </div>
              </div>

              {customAmount !== '' && Number(customAmount) !== standardPrice && (
                <div className="p-3 bg-[#12121A] border border-border-dark rounded-lg flex justify-between font-mono text-[10px]">
                  <span className="text-text-secondary">Expected Price: ₹{standardPrice}</span>
                  <span className="text-yellow-400">Discount Added: ₹{standardPrice - Number(customAmount)}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Internal Supervisor Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular client discount, birth event"
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-6 border-t border-[#2a2a3e] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary hover:text-white"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={executeAddWalkIn}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 btn-gradient text-white shadow-md shadow-brand-purple/10 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Locking Rig...</span>
                    </>
                  ) : (
                    <>
                      <span>✅ Lock Slot - Collect ₹{finalPrice}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Override Warning Modal */}
      {showSoftHoldWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-51 p-4">
          <div className="w-full max-w-sm bg-[#1A1A2E] border border-red-500/20 p-6 rounded-2xl space-y-4">
            <div className="flex gap-2 items-center text-yellow-500">
              <AlertTriangle className="h-6 w-6" />
              <h4 className="font-bold font-display text-white">Override Active Soft Hold?</h4>
            </div>
            <p className="text-xs text-text-secondary leading-normal">
              This slot is currently held temporarily for customer <strong className="text-white">{showSoftHoldWarning.customerNameStr}</strong> (Ref: {showSoftHoldWarning.bookingRef}).
            </p>
            <p className="text-xs text-red-400 font-bold leading-normal">
              Registering a walk-in here will immediately cancel their hold booking and notify them. Proceed?
            </p>
            <div className="flex gap-4 pt-1.5">
              <button
                onClick={() => setShowSoftHoldWarning(null)}
                className="w-1/2 py-2 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary hover:text-white cursor-pointer"
              >
                No, Go Back
              </button>
              <button
                onClick={confirmSoftHoldOverride}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold uppercase text-white cursor-pointer"
              >
                Yes, Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
