import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Slot, VenueResource, Booking, Offer } from '../types';
import { 
  Tv, Cpu, Landmark, Sparkles, Check, ChevronRight, Play, AlertTriangle, 
  HelpCircle, CreditCard, ShieldCheck, Ticket, QrCode, ArrowLeft, Loader2, Clock, ShieldAlert, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export const BookingFlowPage: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { 
    venues, resources, slots, currentUser, offers, createBookingHold, confirmOnlineBooking, platformFee, bookings, profiles
  } = useApp();

  const venue = venues.find(v => v.id === venueId);
  const venueResources = resources.filter(r => r.venue_id === venueId && r.is_active);

  const ownerProfile = React.useMemo(() => {
    if (!venue) return null;
    return profiles.find(p => p.id === venue.owner_id);
  }, [venue, profiles]);

  // Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Direct split UPI payment verification state
  const [paidOwner, setPaidOwner] = useState(false);
  const [paidPlatform, setPaidPlatform] = useState(false);
  const [upiTxnId, setUpiTxnId] = useState('');

  // Step 1 Selections
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return searchParams.get('date') || new Date().toISOString().split('T')[0];
  });
  const [selectedResource, setSelectedResource] = useState<VenueResource | null>(() => {
    const rId = searchParams.get('resourceId');
    if (rId) {
      return venueResources.find(item => item.id === rId) || null;
    }
    return null;
  });
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]); // list of start times, e.g. ["10:00", "11:00"]

  // Step 2 Core State
  const [useCoins, setUseCoins] = useState(false);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'pay_at_venue'>('online');
  const [payAtVenueConfirmModal, setPayAtVenueConfirmModal] = useState(false);
  const [softHoldCheckboxAccepted, setSoftHoldCheckboxAccepted] = useState(false);

  // Step 3 Result State
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Live Timer for Confirmation countdown
  const [countdownSeconds, setCountdownSeconds] = useState<number>(900); // 15 mins default

  // Validation Route Protect
  useEffect(() => {
    if (!currentUser) {
      toast.error('Authentication is required to book a session');
      navigate('/login', { state: { from: `/booking/${venueId}` } });
    }
  }, [currentUser]);

  useEffect(() => {
    if (step === 3 && confirmedBooking?.payment_method === 'pay_at_venue') {
      const handle = setInterval(() => {
        setCountdownSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(handle);
    }
  }, [step, confirmedBooking]);

  if (!venue) {
    return <div className="p-8 text-center text-white font-sans">Arena not registered in layout registry.</div>;
  }

  // Get next 7 days for Step 1 horizontally scrollable
  const getDayDetails = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dayLabel = offset === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const dateStr = d.toISOString().split('T')[0];
    return { label: dayLabel, num: dayNum, dateStr };
  };

  const getDayList = [0, 1, 2, 3, 4, 5, 6].map(getDayDetails);

  // Filter slots matching Resource & Date (Seeded automatically)
  const resourceSlots = selectedResource 
    ? slots.filter(s => s.resource_id === selectedResource.id && s.slot_date === selectedDate)
    : [];

  // Sort slots by start hours
  const sortedResourceSlots = [...resourceSlots].sort((a, b) => {
    return parseInt(a.start_time.split(':')[0]) - parseInt(b.start_time.split(':')[0]);
  });

  // Consecutive Slot Selection Control
  const handleSlotToggle = (slotTime: string) => {
    if (selectedTimes.includes(slotTime)) {
      // Remove selected slot
      setSelectedTimes(prev => prev.filter(t => t !== slotTime));
    } else {
      // If we already have entries, make sure selection is consecutive
      if (selectedTimes.length > 0) {
        const sortedSelected = [...selectedTimes, slotTime].sort();
        const firstHour = parseInt(sortedSelected[0].split(':')[0]);
        const isConsecutive = sortedSelected.every((t, i) => parseInt(t.split(':')[0]) === firstHour + i);
        if (!isConsecutive) {
          toast.error('Please select consecutive slots only');
          return;
        }
      }
      setSelectedTimes(prev => [...prev, slotTime].sort());
    }
  };

  // Offers Engine Match (Rule 7)
  const duration = selectedTimes.length;
  const basePrice = selectedResource ? selectedResource.price_per_hour * duration : 0;

  const getQualifyingOffer = (): Offer | null => {
    if (!selectedResource) return null;
    
    // Get active offers
    const activeOffers = offers.filter(o => o.venue_id === venue.id && o.is_active);
    
    // Find qualifying day of selectedDate
    const dObj = new Date(selectedDate);
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const activeDayLabel = daysArr[dObj.getDay()];

    const qualifiers = activeOffers.filter(o => {
      const dayMatches = o.valid_days.some(d => d.toLowerCase() === activeDayLabel.toLowerCase());
      const durationMatches = duration >= o.min_booking_hours;
      
      // Basic range validation
      return dayMatches && durationMatches;
    });

    if (qualifiers.length === 0) return null;

    // Pick highest discount value contribution
    return qualifiers.reduce((best, current) => {
      const discountBest = best.discount_type === 'percentage' 
        ? Math.floor((basePrice * best.discount_value) / 100) 
        : best.discount_value;
      const discountCurrent = current.discount_type === 'percentage' 
        ? Math.floor((basePrice * current.discount_value) / 100) 
        : current.discount_value;
      return discountCurrent > discountBest ? current : best;
    }, qualifiers[0]);
  };

  const matchedOffer = getQualifyingOffer();
  
  // Calculate discount figures
  let offerDiscountPrice = 0;
  if (matchedOffer) {
    if (matchedOffer.discount_type === 'percentage') {
      offerDiscountPrice = Math.floor((basePrice * matchedOffer.discount_value) / 100);
      if (matchedOffer.max_discount_amount) {
        offerDiscountPrice = Math.min(offerDiscountPrice, matchedOffer.max_discount_amount);
      }
    } else {
      offerDiscountPrice = matchedOffer.discount_value;
    }
  }

  // Coin Payout boundaries (Rule 5)
  const userBookings = bookings.filter(b => b.customer_id === currentUser?.id && b.booking_status !== 'cancelled');
  const isFirstBooking = userBookings.length === 0;

  const maxAvailableCoins = currentUser?.garf_coins || 0;
  // Maximum Coins discount cap is 50% net slot amount (1 GARF Coin = 1 Rupee)
  const netBeforeCoins = basePrice - offerDiscountPrice;
  // REDEMPTION IS ONLY AVAILABLE ON THE FIRST ORDER / BOOKING ONLY
  const maxCoinsBurnAllowed = isFirstBooking ? Math.min(maxAvailableCoins, Math.floor(netBeforeCoins * 0.5)) : 0;
  
  // Adjusted live coins discount
  const coinsUsedBounded = useCoins ? Math.min(coinsToRedeem, maxCoinsBurnAllowed) : 0;
  const coinsDiscountAmountValue = coinsUsedBounded;

  const finalCheckoutAmount = Math.max(0, netBeforeCoins - coinsDiscountAmountValue + platformFee);

  const isPayAtVenueAvailable = React.useMemo(() => {
    if (!selectedTimes.length || !selectedDate) return false;
    const now = new Date();
    const [hours, minutes] = selectedTimes[0].split(':').map(Number);
    const slotD = new Date(selectedDate);
    slotD.setHours(hours, minutes, 0, 0);

    const isSameDay = 
      now.getFullYear() === slotD.getFullYear() &&
      now.getMonth() === slotD.getMonth() &&
      now.getDate() === slotD.getDate();

    const diffMs = slotD.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return isSameDay && diffHours >= 0 && diffHours <= 2;
  }, [selectedTimes, selectedDate]);

  const isBlockedFromSoftHold = currentUser?.pay_at_venue_blocked || (currentUser?.no_show_count || 0) >= 3;

  // Advance to Step 2
  const handleProceedStep2 = () => {
    if (!selectedResource || selectedTimes.length === 0) {
      toast.error('Select your PC/Turf station and at least 1 slot');
      return;
    }
    setStep(2);
  };

  // Perform Final Booking Confirmation (Rule 1 & Rule 2)
  const handleFinalCheckout = async () => {
    try {
      setLoading(true);
      
      // 1. Create Hold state in DB (instantly locks slots)
      const bookingHold = await createBookingHold({
        venueId: venue.id,
        resourceId: selectedResource!.id,
        date: selectedDate,
        slots: selectedTimes,
        coinsToUse: coinsUsedBounded,
        offerId: matchedOffer ? matchedOffer.id : null,
        paymentMethod: paymentMethod
      });

      // 2. Perform payment completions
      if (paymentMethod === 'online') {
        // online completion delay simulator (1.5s)
        await new Promise(res => setTimeout(res, 1500));
        
        // Confirm booking as paid online
        const confirmedResult = await confirmOnlineBooking(bookingHold.id, upiTxnId);
        setConfirmedBooking(confirmedResult);
        toast.success('Online Payment complete! Slot confirmed 🎉');
      } else {
        // pay-at-venue transitions held
        setConfirmedBooking(bookingHold);
        
        // Setup initial 15-min countdown
        setCountdownSeconds(900); // 15 mins (Rule 2)
        toast.success('Pay-At-Venue Hold activated! Arrive on time.');
      }

      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Booking conflict identified.');
    } finally {
      setLoading(false);
      setPayAtVenueConfirmModal(false);
    }
  };

  // Formatting helper seconds -> MM:SS
  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans text-white select-none pb-20">
      
      {/* 1. TOP PROGRESS BAR HOOK */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 pb-8 border-b border-border-dark mb-10 overflow-x-auto">
        {[
          { num: 1, label: 'Select Slots' },
          { num: 2, label: 'Review & Pay' },
          { num: 3, label: 'Confirmation' }
        ].map(item => (
          <React.Fragment key={item.num}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${step === item.num ? 'bg-brand-purple text-white glow-purple' : (step > item.num ? 'bg-brand-green text-black' : 'bg-[#161622] border border-border-dark text-text-secondary')}`}>
                {step > item.num ? <Check className="h-4.5 w-4.5" /> : item.num}
              </span>
              <span className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${step === item.num ? 'text-brand-purple' : 'text-text-secondary'}`}>
                {item.label}
              </span>
            </div>
            {item.num < 3 && (
              <span className="h-0.5 w-8 sm:w-16 bg-border-dark"></span>
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* STEP 1 CONTROLS */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Header Titles */}
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight">Configure Your <span className="text-gradient">Session</span></h1>
              <p className="text-text-secondary text-xs sm:text-sm mt-1">Pick date, select PC or turf station, and secure consecutive slots</p>
            </div>

            {/* A. DATE HORIZ PILLS */}
            <div className="space-y-3">
              <span className="text-xs uppercase font-mono text-text-secondary tracking-widest font-bold block">1. SECURE PLAY DATE</span>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {getDayList.map(item => {
                  const isSel = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => { setSelectedDate(item.dateStr); setSelectedTimes([]); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[65px] font-mono border transition ${isSel ? 'bg-brand-purple border-brand-purple text-white glow-purple shadow-lg shadow-brand-purple/20' : 'bg-[#12121A] border-[#2a2a3e] text-text-secondary hover:text-white hover:border-brand-purple/40'}`}
                    >
                      <span className="text-[10px] tracking-wider uppercase font-bold">{item.label}</span>
                      <span className="text-xl font-black mt-1 leading-none">{item.num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. RESOURCE SELECTOR */}
            <div className="space-y-4">
              <span className="text-xs uppercase font-mono text-text-secondary tracking-widest font-bold block">2. CHOOSE STATION / COUPLING RIG</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venueResources.map(res => {
                  const isSel = selectedResource?.id === res.id;
                  return (
                    <button
                      key={res.id}
                      onClick={() => { setSelectedResource(res); setSelectedTimes([]); }}
                      className={`text-left p-5 rounded-2xl bg-[#12121A] border transition flex flex-col justify-between gap-4 w-full cursor-pointer hover:bg-[#161622] ${isSel ? 'border-brand-purple glow-purple bg-brand-purple/5' : 'border-[#2a2a3e]'}`}
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center gap-2 text-brand-purple">
                          {res.type === 'pc' ? <Cpu className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                          <span className="font-bold text-base text-white">{res.name}</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed font-mono truncate-3-lines">
                          {res.specifications || 'Standard elite-class gameplay configurations.'}
                        </p>
                      </div>

                      <div className="flex justify-between items-end w-full border-t border-border-dark/40 pt-3">
                        <span className="text-[10px] text-text-secondary font-mono">RATE PER HOUR</span>
                        <p className="text-lg font-black font-mono text-white">₹{res.price_per_hour}/hr</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C. TIME SLOT GRID */}
            <div className="space-y-4">
              <span className="text-xs uppercase font-mono text-text-secondary tracking-widest font-bold block">3. SECURE HOURS TIME SLOT</span>
              
              {!selectedResource ? (
                <div className="p-8 bg-[#12121A]/40 border border-dashed border-[#2a2a3e] rounded-xl text-center text-text-secondary text-sm">
                  Please pick your target PC/Turf station card above to load active slot matrices.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {sortedResourceSlots.map((sl, idx) => {
                    const isSelected = selectedTimes.includes(sl.start_time);
                    const isHeld = sl.status === 'held';
                    const isBooked = sl.status === 'booked';
                    const isBlocked = sl.status === 'blocked';

                    let blockClass = 'border-[#2a2a3e] bg-[#12121A] text-white hover:border-brand-purple cursor-pointer';
                    let label = sl.start_time;

                    if (isSelected) {
                      blockClass = 'border-brand-purple bg-brand-purple text-white glow-purple';
                    } else if (isHeld) {
                      blockClass = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500/50 cursor-not-allowed';
                    } else if (isBooked) {
                      blockClass = 'bg-red-500/10 border-red-500/30 text-red-500/50 cursor-not-allowed';
                    } else if (isBlocked) {
                      blockClass = 'bg-gray-500/10 border-gray-500/30 text-gray-500/50 cursor-not-allowed';
                    }

                    return (
                      <button
                        key={sl.id || idx}
                        disabled={isHeld || isBooked || isBlocked}
                        onClick={() => handleSlotToggle(sl.start_time)}
                        className={`p-3.5 border rounded-xl font-mono text-xs sm:text-sm font-semibold text-center transition ${blockClass}`}
                        title={isBooked ? 'Already booked' : (isHeld ? 'Held temporarily' : (isBlocked ? 'Blocked' : 'Available'))}
                      >
                        <p>{label}</p>
                        {isHeld && <span className="text-[9px] uppercase font-bold block text-yellow-500">HELD</span>}
                        {isBooked && <span className="text-[9px] uppercase font-bold block text-red-500">BOOKED</span>}
                        {isBlocked && <span className="text-[9px] uppercase font-bold block text-gray-500">BLOCKED</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* STEP 1 DYNAMIC SLOT SUMMARY PANEL (1/3 width, sticky) */}
          <aside className="lg:col-span-1 bg-card-dark border border-border-dark p-6 rounded-2xl sticky top-24 space-y-6">
            <h4 className="font-bold border-b border-border-dark pb-3 text-lg font-display">Play Summary</h4>
            
            <div className="space-y-4 text-sm text-text-secondary leading-normal regular">
              <div>
                <span className="text-[10px] text-text-secondary font-mono tracking-widest block font-bold">ARENA DESTINATION</span>
                <p className="font-bold text-white text-base">{venue.name}</p>
              </div>

              {selectedResource && (
                <div>
                  <span className="text-[10px] text-text-secondary font-mono tracking-widest block">STATION CHOSEN</span>
                  <p className="font-bold text-white text-sm">{selectedResource.name}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-text-secondary font-mono tracking-widest block">DATE</span>
                  <p className="font-semibold text-white font-mono">{selectedDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary font-mono tracking-widest block">HOURS SECURED</span>
                  <p className="font-semibold text-white font-mono">{duration ? `${duration} hr play` : '0 segments'}</p>
                </div>
              </div>

              {selectedTimes.length > 0 && (
                <div>
                  <span className="text-[10px] text-text-secondary font-mono tracking-widest block">TIMELINE CHANNELS</span>
                  <p className="text-xs font-semibold text-brand-cyan font-mono leading-relaxed line-clamp-2">
                    {selectedTimes.join(' | ')}
                  </p>
                </div>
              )}

              {/* Promo offer live text if qualifies */}
              {matchedOffer && (
                <div className="p-3 bg-brand-green/5 border border-dashed border-brand-green/30 rounded-lg flex items-center gap-2 text-xs">
                  <span className="text-base">🏷️</span>
                  <p className="text-brand-green font-medium">
                    Offer <strong>{matchedOffer.title}</strong> automatically applied of -₹{offerDiscountPrice}!
                  </p>
                </div>
              )}
            </div>

            {/* Run total */}
            <div className="border-t border-[#2a2a3e]/60 pt-4 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-text-secondary font-mono uppercase block">RUNNING TOTAL</span>
                <p className="text-2xl font-black font-mono text-white">₹{basePrice - offerDiscountPrice + platformFee}</p>
              </div>
              <span className="text-[9px] text-text-secondary/60 font-mono">+₹5 Platform Fee</span>
            </div>

            <button
              disabled={!selectedResource || selectedTimes.length === 0}
              onClick={handleProceedStep2}
              className="w-full py-3.5 btn-gradient rounded-xl font-bold text-white text-center shadow-lg disabled:opacity-40 transition flex items-center justify-center gap-1.5"
            >
              <span>Continue to Checkout</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </aside>

        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* STEP 2: PAYMENT & OPTIONS CHECKOUT LAYER */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <button 
                onClick={() => setStep(1)} 
                className="flex items-center gap-1.5 text-xs text-brand-cyan hover:underline font-bold tracking-widest font-mono uppercase mb-4"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span>Change Selections</span>
              </button>
              <h1 className="text-3xl font-display font-extrabold tracking-tight text-white">Review & <span className="text-gradient">Secure Booking</span></h1>
              <p className="text-text-secondary text-xs sm:text-sm mt-1">Select checkout gateways to secure your turf or cafe play slot</p>
            </div>

            {/* B. GATEWAY INFO */}
            <div className="space-y-4">
              <span className="text-xs uppercase font-mono text-text-secondary font-bold tracking-widest block">PAYMENT MODE</span>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Method 1: Pay Online */}
                <div
                  className="text-left p-6 bg-[#12121A] rounded-2xl border border-brand-purple/30 glow-purple bg-brand-purple/5 relative flex flex-col gap-4 font-sans"
                >
                  <span className="absolute top-3 right-3 bg-brand-green/10 border border-brand-green/30 text-brand-green text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    SECURED
                  </span>

                  <div className="space-y-2">
                    <div className="flex gap-2 items-center text-brand-purple">
                      <CreditCard className="h-5 w-5" />
                      <h4 className="font-bold text-base text-white">Pay Online Securely</h4>
                    </div>
                    <ul className="text-xs text-text-secondary space-y-1.5 leading-relaxed">
                      <li>• Instant slot lock-id (zero hold wait)</li>
                      <li>• UPI, card, and digital networks secure</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>

            {/* Direct Unified UPI Payment (Single destination: Owner) */}
            {paymentMethod === 'online' && (
              <div className="bg-[#12121A] border border-brand-cyan/20 rounded-2xl p-6 space-y-6 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-brand-cyan" />
                
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-xl">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white font-display">Direct UPI Payment</h3>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      To secure your slot, please make a single UPI payment of the total booking amount. The entire amount (including the ₹5 platform fee) will go directly to the arena owner's UPI address.
                    </p>
                  </div>
                </div>

                <div className="max-w-md mx-auto bg-[#161622] border border-[#2a2a3e] rounded-xl p-5 space-y-4">
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-brand-cyan">RECIPIENT & SETTLEMENT</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono">
                        Direct Arena Settlement
                      </span>
                    </div>
                    
                    <div className="pt-1 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-[#8e8ea8] uppercase font-bold font-mono">Total Amount</p>
                        <p className="text-2xl font-black text-white font-mono">₹{finalCheckoutAmount}</p>
                      </div>
                      <div className="text-right text-[11px] text-text-secondary font-sans leading-tight">
                        <p>Slot Charge: <strong>₹{Math.max(0, finalCheckoutAmount - 5)}</strong></p>
                        <p>Platform Fee: <strong>₹5</strong></p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-[10px] text-[#8e8ea8] uppercase font-bold font-mono">Recipient Owner UPI ID</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-xs text-white font-mono bg-black/40 px-2 py-1 rounded border border-[#2a2a3e] truncate">
                          {ownerProfile?.upi_id || `${venue?.name.toLowerCase().replace(/\s+/g, '') || 'venue'}@okaxis`}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ownerProfile?.upi_id || `${venue?.name.toLowerCase().replace(/\s+/g, '') || 'venue'}@okaxis`);
                            toast.success('Owner UPI ID copied! 📋');
                          }}
                          className="p-1.5 bg-[#202030] hover:bg-brand-cyan/20 hover:text-white text-text-secondary rounded-lg transition"
                          title="Copy UPI ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      {!ownerProfile?.upi_id && (
                        <p className="text-[9px] text-yellow-500 mt-1">
                          ⚠️ Owner has not configured their custom UPI; using name fallback.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unified QR Code */}
                  <div className="pt-2 border-t border-[#2a2a3e] space-y-3 font-sans">
                    <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg">
                      <div className="p-1.5 bg-white rounded-lg border border-border-dark flex-shrink-0">
                        <QrCode className="h-16 w-16 text-black" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] text-white leading-tight font-semibold">
                          Scan single QR to pay
                        </p>
                        <p className="text-[10px] text-text-secondary leading-normal">
                          Funds go directly to the owner's bank account (<strong className="text-brand-cyan">{ownerProfile?.upi_id || `${venue?.name.toLowerCase().replace(/\s+/g, '') || 'venue'}@okaxis`}</strong>).
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 bg-[#11111A] rounded-xl border border-brand-cyan/20">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-[#8e8ea8] uppercase tracking-wider font-bold">
                          Enter 12-digit UPI Transaction Ref ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={upiTxnId}
                          onChange={(e) => setUpiTxnId(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                          placeholder="e.g. 628491038592"
                          maxLength={16}
                          className="w-full px-3.5 py-2 bg-[#1A1A2E] border border-[#2a2a3e] rounded-lg text-xs font-mono text-white focus:border-brand-cyan focus:outline-none"
                        />
                        <p className="text-[10px] text-[#8e8ea8]">
                          💡 <strong>Owner Verification:</strong> Owners manually verify this Transaction ID against their UPI ledger. Providing false references will result in instant cancellation of your slot and a potential ban!
                        </p>
                      </div>

                      <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#161625] hover:bg-[#1C1C2D] cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={paidOwner && paidPlatform}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPaidOwner(checked);
                            setPaidPlatform(checked);
                          }}
                          disabled={upiTxnId.trim().length < 8}
                          className="rounded text-brand-cyan bg-[#1A1A2E] border-[#2a2a3e] focus:ring-brand-cyan focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs font-bold text-white select-none leading-tight">
                          I have paid ₹{finalCheckoutAmount} and entered my correct reference
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {(!paidOwner || !paidPlatform || upiTxnId.trim().length < 8) && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2.5 text-yellow-500 text-xs leading-normal font-sans justify-center">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span>Please enter your UPI transaction reference ID and check the confirmation box.</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* STEP 2 FINAL BILL BREAKDOWN PANEL (1/3 width, sticky) */}
          <aside className="lg:col-span-1 bg-card-dark border border-border-dark p-6 rounded-2xl sticky top-24 space-y-6">
            <h4 className="font-bold border-b border-border-dark pb-3 text-lg font-display">Price Details</h4>
            
            <div className="space-y-3.5 text-xs font-mono text-text-secondary">
              <div className="flex justify-between">
                <span>Base slot rates ({duration} hr play)</span>
                <span className="text-white font-bold">₹{basePrice}</span>
              </div>
              
              {matchedOffer && (
                <div className="flex justify-between text-brand-green">
                  <span>🏷️ applied promo discount</span>
                  <span className="font-bold">-₹{offerDiscountPrice}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Customer secure platform fee</span>
                <span className="text-white">+₹{platformFee}</span>
              </div>

              <div className="border-t border-[#2a2a3e] pt-4 flex flex-col gap-2">
                <div className="flex justify-between items-end text-sm sm:text-base">
                  <span className="font-display font-bold text-white uppercase text-xs">TOTAL TO SECURE</span>
                  <span className="text-2xl font-black font-mono text-white leading-none">₹{finalCheckoutAmount}</span>
                </div>
              </div>
            </div>

            {paymentMethod === 'online' && (
              <div className="text-[10px] text-red-400 font-mono text-center flex items-center justify-center gap-1.5 p-2 bg-red-500/10 border border-red-500/20 rounded-xl leading-tight">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span>No refund on cancellation</span>
              </div>
            )}

            {/* Action Checkout Trigger */}
            {paymentMethod === 'online' ? (
              <button
                onClick={handleFinalCheckout}
                disabled={loading || !paidOwner || !paidPlatform || upiTxnId.trim().length < 8}
                className={`w-full py-4 text-center font-black text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg ${
                  (!paidOwner || !paidPlatform || upiTxnId.trim().length < 8) 
                    ? 'bg-[#1e1e2d] text-text-secondary/40 border border-border-dark cursor-not-allowed hover:bg-[#1e1e2d]' 
                    : 'btn-gradient hover:opacity-95 text-white cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Authorizing Split Settlements...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Transfers & Book (₹{finalCheckoutAmount})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSoftHoldCheckboxAccepted(false);
                  setPayAtVenueConfirmModal(true);
                }}
                disabled={loading}
                className="w-full py-4 text-center bg-yellow-500 hover:bg-yellow-600 font-black text-sm text-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md font-sans cursor-pointer"
              >
                <span>Confirm - Pay at Venue</span>
              </button>
            )}

            <p className="text-[10px] text-text-secondary/60 text-center uppercase tracking-wider font-mono">Direct routing active: Owner UPI ID + Admin Platform Fee split</p>
          </aside>

        </div>
      )}

      {step === 3 && confirmedBooking && (
        <div className="max-w-xl mx-auto space-y-8 font-sans">
          
          {/* A. BRANDING CONFIRMED CAP */}
          {confirmedBooking.payment_method === 'online' ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-brand-green/10 border border-brand-green/20 rounded-full text-brand-green shadow-xl shadow-brand-green/5 animate-pulse">
                <ShieldCheck className="h-10 w-10 text-brand-green" />
              </div>
              <h1 className="text-4xl font-display font-black text-white">Booking Confirmed! 🎉</h1>
              <p className="text-text-secondary text-sm sm:text-base">Your computing rig/turf hours matches are permanently locked now.</p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 animate-pulse">
                <Clock className="h-10 w-10 text-yellow-500" />
              </div>
              <h1 className="text-4xl font-display font-black text-white">Slot Held! ⏳</h1>
              <p className="text-text-secondary text-sm">Please arrive on coordinates on time. Held slot requires checkout validation.</p>
            </div>
          )}

          {/* B. WARNING OR COUNTDOWN TIMER INFO ON PAY-AT-VENUE (Rule 2) */}
          {confirmedBooking.payment_method === 'pay_at_venue' && (
            <div className="bg-yellow-500/5 p-5 border border-dashed border-yellow-500/30 rounded-2xl text-center space-y-4">
              <div>
                <p className="text-[#A0A0B8] text-xs font-mono uppercase tracking-widest">LIVE EXPIRY TIMER</p>
                <p className="text-4xl font-black font-mono mt-1 text-yellow-500 animate-pulse">
                  {formatCountdown(countdownSeconds)}
                </p>
              </div>

              <div className="bg-yellow-500/10 text-yellow-500 p-4 border border-yellow-500/25 rounded-xl text-left text-xs sm:text-sm leading-relaxed">
                ⚠️ Your slot is held for only 15 minutes past start time! If you are not physically checked in by supervisor before countdown hits zero, your hold cancels automatically.
              </div>
            </div>
          )}

          {/* C. GENERAL BOOKING DETAILS CARD */}
          <div className="bg-[#12121A] border border-[#2a2a3e] p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-border-dark pb-4">
              <span className="text-xs uppercase font-mono text-text-secondary block font-bold">Booking Reference</span>
              <span className="font-mono text-lg font-black text-white tracking-widest uppercase">{confirmedBooking.booking_ref}</span>
            </div>

            <div className="space-y-4 text-sm text-text-secondary leading-normal">
              <div className="flex justify-between">
                <span>Arena destination:</span>
                <span className="text-white font-bold">{venue?.name}</span>
              </div>
              <div className="flex justify-between">
                <span> RIG system / Field pitch:</span>
                <span className="text-white font-semibold">{selectedResource?.name}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Date:</span>
                <span className="text-white">{confirmedBooking.booking_date}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Hours reserved:</span>
                <span className="text-white">
                  {confirmedBooking.start_time} - {confirmedBooking.end_time} ({confirmedBooking.duration_hours} hr play)
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Total transacted:</span>
                <span className="text-white font-black text-base">₹{confirmedBooking.final_amount}</span>
              </div>
            </div>

            {/* QR CARD */}
            {confirmedBooking.payment_method === 'online' && (
              <div className="pt-6 border-t border-border-dark flex flex-col items-center text-center space-y-4">
                <div className="bg-white p-3 rounded-lg border-2 border-brand-purple">
                  <QrCode className="h-32 w-32 text-black" />
                </div>
                <span className="text-[10px] text-text-secondary/60 uppercase font-bold tracking-widest font-mono">Show ticket code to operator at counter</span>
              </div>
            )}
          </div>

          {/* Action redirects */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full sm:w-1/2 py-3.5 bg-[#12121A] border border-[#2a2a3e] hover:border-brand-purple hover:text-white rounded-xl text-center text-sm font-bold text-text-secondary transition"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="w-full sm:w-1/2 py-3.5 btn-gradient rounded-xl text-center text-sm font-bold text-white shadow-md hover:opacity-95"
            >
              Book Another Arena
            </button>
          </div>

        </div>
      )}

      {/* ⚠️ HELD PAY AT VENUE CONFIRM POPUP MODAL */}
      {payAtVenueConfirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 leading-normal">
          <div className="w-full max-w-md bg-[#12121A] border border-yellow-500/20 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-yellow-500 border-b border-border-dark pb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="font-bold text-lg font-display">Confirm Pay at Venue?</h3>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Kindly note, your slot matches are only reserved in our database for **15 minutes past slot start hours**! If you do not physically arrive at the supervisor desk and check-in ahead of the timeout trigger, the slot recyclings release instantly.
            </p>

            <div className="flex items-start gap-2 bg-yellow-500/5 p-3.5 border border-yellow-500/15 rounded-lg">
              <input
                id="soft-held-checkbox"
                type="checkbox"
                checked={softHoldCheckboxAccepted}
                onChange={(e) => setSoftHoldCheckboxAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#2a2a3e] bg-[#0c0c12] text-yellow-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="soft-held-checkbox" className="text-xs text-text-secondary select-none leading-relaxed cursor-pointer font-sans">
                I explicitly understand that a soft hold is <strong className="text-white font-bold">not guaranteed</strong> if I do not arrive and check-in within 15 minutes of my slot start time.
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPayAtVenueConfirmModal(false)}
                className="w-1/2 py-3 bg-[#161622] rounded-xl font-bold text-sm text-text-secondary hover:text-white transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleFinalCheckout}
                disabled={loading || !softHoldCheckboxAccepted}
                className={`w-1/2 py-3 rounded-xl font-black text-sm text-black transition cursor-pointer ${
                  !softHoldCheckboxAccepted ? 'bg-yellow-500/40 grayscale cursor-not-allowed text-black/60' : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                Yes Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
