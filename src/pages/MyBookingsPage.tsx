import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Booking, Venue, VenueResource } from '../types';
import { 
  Calendar, Clock, User, QrCode, AlertTriangle, CheckSquare, 
  Trash2, Award, ShieldCheck, X, Star, CreditCard, ShoppingBag 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MyBookingsPage: React.FC = () => {
  const { 
    currentUser, bookings, venues, resources, cancelBooking, submitReview, reviews
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [ticker, setTicker] = useState<number>(0);

  // Modal toggles
  const [selectedQRBooking, setSelectedQRBooking] = useState<Booking | null>(null);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Review toggle
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // 1. Ticker for countdown updates
  useEffect(() => {
    const handle = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(handle);
  }, []);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 text-white font-sans">
        <span className="text-5xl">🎮</span>
        <h2 className="text-2xl font-bold font-display">Authentication Required</h2>
        <p className="text-text-secondary text-sm">Please log in to inspect your secure GARF reservations portal.</p>
      </div>
    );
  }

  // Fetch associated models helper
  const getVenueAndResource = (venueId: string, resourceId: string) => {
    const v = venues.find(item => item.id === venueId);
    const r = resources.find(item => item.id === resourceId);
    return { venue: v, resource: r };
  };

  // Helper date parsing (for separating Tabs)
  const isPastDate = (dateStr: string, timeStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) return true;
    if (dateStr === todayStr) {
      const nowHr = new Date().getHours();
      const slotHr = parseInt((timeStr || '09:00').split(':')[0]);
      return nowHr > slotHr;
    }
    return false;
  };

  // Filter Bookings (Rules)
  const myBookings = bookings.filter(b => b.customer_id === currentUser.id);

  const upcomingList = myBookings.filter(b => {
    const statusValid = b.booking_status === 'confirmed' || b.booking_status === 'held' || b.booking_status === 'checked_in';
    return statusValid && !isPastDate(b.booking_date, b.start_time);
  });

  const pastList = myBookings.filter(b => {
    if (b.booking_status === 'completed' || b.booking_status === 'no_show') return true;
    return isPastDate(b.booking_date, b.start_time) && b.booking_status !== 'cancelled';
  });

  const cancelledList = myBookings.filter(b => b.booking_status === 'cancelled');

  // Compute stats counts
  const totalBookings = myBookings.length;
  const totalUpcoming = upcomingList.length;
  const totalCompleted = myBookings.filter(b => b.booking_status === 'completed').length;

  const showTabList = activeTab === 'upcoming' ? upcomingList : (activeTab === 'past' ? pastList : cancelledList);

  // Live hold countdown timer display (Rule 2)
  const renderHoldTimer = (booking: Booking) => {
    if (!booking.hold_expires_at || booking.booking_status !== 'held') return null;

    const expiry = new Date(booking.hold_expires_at).getTime();
    const diff = expiry - Date.now();

    if (diff <= 0) {
      return <span className="text-red-500 font-bold font-mono text-xs animate-pulse"> Hold Expired! Released.</span>;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const isCrisis = mins < 5;

    return (
      <div className={`p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs mt-3 flex items-center justify-between ${isCrisis ? 'bg-red-500/10 border-red-500/20 pulse-glowing-glow' : ''}`}>
        <span className="text-text-secondary">⏳ PAY AT VENUE HOLD ACTIVE:</span>
        <span className={`font-mono font-black text-sm ${isCrisis ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    );
  };

  // Refund calculation previews (Rule 4)
  const previewCancellationRefund = (booking: Booking) => {
    if (booking.payment_method !== 'online') {
      return { refund: 0, pct: 100, msg: 'Pay-at-Venue hold cancelled safely!' };
    }
    return { refund: booking.final_amount, pct: 100, msg: `Full refund (100%): You will receive ₹${booking.final_amount} back instantly!` };
  };

  const handleCancelConfirm = async () => {
    if (!selectedCancelBooking) return;
    try {
      await cancelBooking(selectedCancelBooking.id, cancelReason || 'Cancelled by player');
      toast.success('Reservation cancelled safely and slots recycled! ❌');
      setSelectedCancelBooking(null);
      setCancelReason('');
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed');
    }
  };

  const handleReviewSubmit = () => {
    if (!reviewBooking) return;
    if (!reviewComment.trim()) {
      toast.error('Write some gaming logs description comments!');
      return;
    }
    submitReview(reviewBooking.id, reviewRating, reviewComment);
    toast.success('Thanks for grading of stars! Credits credited. 🪙');
    setReviewBooking(null);
    setReviewComment('');
    setReviewRating(5);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 font-sans select-none text-white space-y-8 pb-20">
      
      {/* Heading + stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[#2a2a3e]">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">My Profile <span className="text-gradient">Bookings</span></h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1"> securing coordinates for computing chairs and athletic turfs</p>
        </div>

        {/* 3 mini stats cards */}
        <div className="flex gap-4 w-full md:w-auto h-fit">
          <div className="bg-[#12121A] border border-[#2a2a3e] px-4 py-2 rounded-xl text-center flex-1 md:flex-none md:w-32">
            <span className="text-[10px] text-text-secondary uppercase">TOTAL</span>
            <p className="text-xl font-bold font-mono mt-0.5">{totalBookings}</p>
          </div>
          <div className="bg-[#12121A] border border-[#2a2a3e] px-4 py-2 rounded-xl text-center flex-1 md:flex-none md:w-32">
            <span className="text-[10px] text-brand-purple uppercase font-bold">UPCOMING</span>
            <p className="text-xl font-bold font-mono mt-0.5 text-brand-purple">{totalUpcoming}</p>
          </div>
          <div className="bg-[#12121A] border border-[#2a2a3e] px-4 py-2 rounded-xl text-center flex-1 md:flex-none md:w-32">
            <span className="text-[10px] text-brand-green uppercase font-bold">COMPLETED</span>
            <p className="text-xl font-bold font-mono mt-0.5 text-brand-green">{totalCompleted}</p>
          </div>
        </div>
      </div>

      {/* Tabs list switches */}
      <div className="flex border-b border-[#2a2a3e] gap-4">
        {[
          { key: 'upcoming', label: `Upcoming (${upcomingList.length})` },
          { key: 'past', label: `Completed & Past (${pastList.length})` },
          { key: 'cancelled', label: `Cancelled (${cancelledList.length})` }
        ].map(tb => (
          <button
            key={tb.key}
            onClick={() => setActiveTab(tb.key as any)}
            className={`pb-3.5 text-sm font-semibold uppercase tracking-wider relative transition ${activeTab === tb.key ? 'text-brand-cyan' : 'text-text-secondary hover:text-white'}`}
          >
            <span>{tb.label}</span>
            {activeTab === tb.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan glow-cyan"></span>
            )}
          </button>
        ))}
      </div>

      {/* Booking Listings mapping */}
      {showTabList.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <Calendar className="h-10 w-10 text-text-secondary/40 mx-auto" />
          <h3 className="text-xl font-semibold">No bookings registered</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            You don't have any sessions tracked inside this folder right now. Discover amazing arenas now!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {showTabList.map(b => {
            const { venue, resource } = getVenueAndResource(b.venue_id, b.resource_id);
            if (!venue || !resource) return null;

            return (
              <div key={b.id} className="glass-card p-6 flex flex-col md:flex-row justify-between gap-6 items-stretch">
                
                <div className="space-y-4 flex-grow">
                  
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-display font-extrabold text-white">{venue.name}</h3>
                    {b.booking_status === 'confirmed' && (
                      <span className="bg-brand-green/10 border border-brand-green/20 text-brand-green text-[10px] font-bold px-2.5 py-1 rounded font-mono">
                        ✓ CONFIRMED
                      </span>
                    )}
                    {b.booking_status === 'held' && (
                      <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2.5 py-1 rounded font-mono">
                        ⏳ HOLD ACTIVE
                      </span>
                    )}
                    {b.booking_status === 'checked_in' && (
                      <span className="bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-bold px-2.5 py-1 rounded font-mono">
                        🔵 CHECKED IN
                      </span>
                    )}
                    {b.booking_status === 'completed' && (
                      <span className="bg-blue-400/10 border border-blue-400/20 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded font-mono">
                        ✓ COMPLETED
                      </span>
                    )}
                    {b.booking_status === 'no_show' && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-2.5 py-1 rounded font-mono">
                        🚫 NO SHOW
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-text-secondary leading-normal">
                    <p className="flex items-center gap-2">
                      <ShoppingBag className="h-4.5 w-4.5 text-brand-purple" />
                      <span className="text-white font-medium">{resource.name}</span>
                    </p>
                    <p className="flex items-center gap-2 font-mono">
                      <Calendar className="h-4.5 w-4.5 text-brand-cyan" />
                      <span>{b.booking_date}</span>
                    </p>
                    <p className="flex items-center gap-2 font-mono">
                      <Clock className="h-4.5 w-4.5 text-yellow-500" />
                      <span>{b.start_time} - {b.end_time} ({b.duration_hours} hr plays)</span>
                    </p>
                    <p className="flex items-center gap-2 font-mono">
                      <CreditCard className="h-4.5 w-4.5 text-brand-green" />
                      <span className="text-white font-semibold">₹{b.final_amount}</span>
                      <span>({b.payment_method.toUpperCase()})</span>
                    </p>
                  </div>

                  {b.booking_status === 'cancelled' && b.cancellation_reason && (
                    <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-xs text-red-400 leading-relaxed font-mono">
                      CANCELLATION REASON: {b.cancellation_reason} (refunded ₹{b.refund_amount})
                    </div>
                  )}

                  {/* Countdown Ticker for Holds */}
                  {renderHoldTimer(b)}
                </div>

                <div className="flex flex-col justify-between items-start md:items-end gap-3 flex-shrink-0 pt-4 md:pt-0 border-t md:border-none border-border-dark font-mono text-xs text-text-secondary">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-secondary/60">REFERENCE</span>
                    <p className="text-base font-black text-white">{b.booking_ref}</p>
                  </div>

                  {/* ACTIVE TAB TRIGGER PORTALS */}
                  {activeTab === 'upcoming' && (
                    <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                      <button
                        onClick={() => setSelectedQRBooking(b)}
                        className="p-3 bg-[#161622] text-brand-cyan hover:text-white border border-[#2a2a3e] hover:border-brand-cyan rounded-lg font-bold flex items-center justify-center gap-1.5 flex-1 md:flex-none cursor-pointer"
                        title="Show Ticket QR"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Show QR Code</span>
                      </button>
                      
                      {b.booking_status !== 'checked_in' && (
                        <button
                          onClick={() => setSelectedCancelBooking(b)}
                          className="p-3 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 rounded-lg font-bold flex items-center justify-center gap-1.5 flex-1 md:flex-none cursor-pointer"
                          title="Abort session"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Cancel Play</span>
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'past' && b.booking_status === 'completed' && (
                    <div className="flex flex-wrap gap-2.5 w-full md:w-auto mt-4 md:mt-0">
                      {reviews.some(r => r.booking_id === b.id) ? (
                        <div className="flex items-center gap-1 text-brand-green font-bold text-xs">
                          <ShieldCheck className="h-4.5 w-4.5" />
                          <span>Review submitted! (+10 coins)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewBooking(b)}
                          className="px-5 py-2.5 btn-gradient rounded-lg text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="h-4 w-4 fill-white" />
                          <span>Leave review & stars!</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 🎟️ TICKET QR CODE MODAL POPUP */}
      {selectedQRBooking && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-dark border border-[#2a2a3e] rounded-2xl p-6 text-center space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-border-dark">
              <span className="font-bold font-display text-sm tracking-widest text-brand-cyan uppercase">GARF PLATFORM TICKET</span>
              <button onClick={() => setSelectedQRBooking(null)} className="p-1.5 rounded bg-[#161622] text-text-secondary hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-2 p-1">
              <h2 className="text-xl font-bold font-display line-clamp-1">
                {venues.find(v => v.id === selectedQRBooking.venue_id)?.name}
              </h2>
              <p className="text-xs text-text-secondary font-mono">
                {selectedQRBooking.booking_date} • {selectedQRBooking.start_time} - {selectedQRBooking.end_time}
              </p>
            </div>

            {/* Simulated Ticket QR Block */}
            <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto flex items-center justify-center border-4 border-brand-purple shadow-lg shadow-brand-purple/20">
              <div className="grid grid-cols-5 gap-1.5 opacity-80">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`h-6 w-6 ${(i % 3 === 0 || i % 7 === 1) ? 'bg-black' : 'bg-transparent'}`}></div>
                ))}
              </div>
            </div>

            <div className="text-xs text-text-secondary font-mono space-y-1 bg-[#161622]/60 py-3 rounded-lg border border-border-dark/60">
              <p className="font-bold text-white uppercase font-mono tracking-widest">REF: {selectedQRBooking.booking_ref}</p>
              <p className="text-[10px]">Show code to booth supervisor on arrival</p>
            </div>
          </div>
        </div>
      )}

      {/* 🚫 CANCELLATION INSURE DIALOG MODAL */}
      {selectedCancelBooking && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-dark border border-red-500/20 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-border-dark">
              <span className="font-bold font-display text-sm text-red-500 flex items-center gap-1.5 uppercase font-mono">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                <span>Confirm Abort Booking</span>
              </span>
              <button onClick={() => setSelectedCancelBooking(null)} className="p-1.5 rounded bg-[#161622] text-text-secondary hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 space-y-2 text-xs sm:text-sm leading-relaxed">
                <p className="text-white font-semibold">Refund Schedule Index:</p>
                <p className="text-text-secondary font-mono">
                  {previewCancellationRefund(selectedCancelBooking).msg}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase">Why are you cancelling?</label>
                <textarea
                  placeholder="Need to change date / squad plan changed..."
                  rows={3}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none font-mono"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setSelectedCancelBooking(null)}
                  className="w-1/2 py-3 bg-[#161622] hover:bg-[#20202d] rounded-xl font-bold text-sm text-text-secondary hover:text-white transition cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="w-1/2 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-black text-sm text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Yes Cancel Booking</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ FEEDBACK STARS MODAL */}
      {reviewBooking && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-dark border border-[#2a2a3e] rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-border-dark">
              <span className="font-bold text-sm tracking-widest text-brand-cyan uppercase">Leave Gameplay Review 🎮</span>
              <button onClick={() => setReviewBooking(null)} className="p-1.5 rounded bg-[#161622] text-text-secondary hover:text-white">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-6 text-center">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest">ARENA TO GRADE</span>
                <h4 className="text-lg font-bold font-display mt-0.5">
                  {venues.find(v => v.id === reviewBooking.venue_id)?.name}
                </h4>
              </div>

              {/* Clickable ratings stars */}
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(starNum => (
                  <button
                    key={starNum}
                    onClick={() => setReviewRating(starNum)}
                    className="p-1.5 hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <Star className={`h-8 w-8 ${starNum <= reviewRating ? 'fill-yellow-500 text-yellow-500' : 'text-text-secondary/40'}`} />
                  </button>
                ))}
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold text-text-secondary uppercase">Comment Feedback</label>
                <textarea
                  placeholder="Specs were solid! Smooth frames / Great lighting on cricket pitches..."
                  rows={4}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple resize-none"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                ></textarea>
                <p className="text-[10px] text-brand-green/80 mt-1 font-mono">🌟 Reward payout +10 GARF Coins dispatches immediately on submission!</p>
              </div>

              <button
                onClick={handleReviewSubmit}
                className="w-full py-3.5 btn-gradient rounded-xl font-bold shadow-md"
              >
                Submit Gameplay Review
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
