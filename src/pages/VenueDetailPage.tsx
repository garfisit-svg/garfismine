import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Star, MapPin, ShieldCheck, Check, Info, Calendar, Clock, 
  Share2, Tag, Wifi, Snowflake, Car, Coffee, Lock, ShieldCheck as CCTV, 
  Tv, Cpu, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VenueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { venues, resources, offers, reviews, currentUser, slots } = useApp();

  // Find venue
  const venue = venues.find(v => v.id === id);
  const venueResources = resources.filter(r => r.venue_id === id && r.is_active);
  const venueOffers = offers.filter(o => o.venue_id === id && o.is_active);
  const venueReviews = reviews.filter(r => r.venue_id === id);

  // Gallery main state
  const [activeImage, setActiveImage] = useState<string>('');

  useEffect(() => {
    if (venue && venue.cover_image) {
      setActiveImage(venue.cover_image);
    }
  }, [venue]);

  // Calendar dates
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);

  if (!venue) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6 font-sans">
        <span className="text-7xl">🚨</span>
        <h1 className="text-3xl font-display font-bold">Arena Not Found</h1>
        <p className="text-text-secondary text-sm">The requested recreation spot might be suspended, offline, or does not exist.</p>
        <button onClick={() => navigate('/explore')} className="px-6 py-2.5 btn-gradient font-bold rounded-lg text-sm">
          Go Back to Explore
        </button>
      </div>
    );
  }

  // Get date strings for sticky calendar panel
  const getDayDetails = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      dayName: days[d.getDay()],
      dayNum: d.getDate(),
      month: months[d.getMonth()],
      dateStr: d.toISOString().split('T')[0]
    };
  };

  const getDirectionsUrl = () => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.address + ' ' + venue.city)}`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Share link copied to clipboard! 🔗');
  };

  // Check Open/Closed status
  const checkOpenStatus = () => {
    const now = new Date();
    const currentHr = now.getHours();
    const currentMin = now.getMinutes();

    const [startHr, startMin] = venue.operating_hours_start.split(':').map(Number);
    const [endHr, endMin] = venue.operating_hours_end.split(':').map(Number);

    const startVal = startHr * 60 + startMin;
    const endVal = endHr * 60 + endMin;
    const currentVal = currentHr * 60 + currentMin;

    if (currentVal >= startVal && currentVal <= endVal) {
      return { status: 'Open Now', open: true };
    }
    return { status: 'Closed Now', open: false };
  };

  const openTimeStatus = checkOpenStatus();

  // Highlight amenities helper
  const amenitiesList = [
    { key: 'wifi', icon: <Wifi className="h-5 w-5" />, label: 'High Speed WiFi' },
    { key: 'ac', icon: <Snowflake className="h-5 w-5" />, label: 'Air Conditioning' },
    { key: 'parking', icon: <Car className="h-5 w-5" />, label: 'Vehicle Parking' },
    { key: 'food_counter', icon: <Coffee className="h-5 w-5" />, label: 'Food Counter' },
    { key: 'washroom', icon: <Check className="h-5 w-5" />, label: 'Clean Washroom' },
    { key: 'lockers', icon: <Lock className="h-5 w-5" />, label: 'Secure Lockers' },
    { key: 'cctv', icon: <CCTV className="h-5 w-5" />, label: '24/7 CCTV surveillance' },
    { key: 'power_backup', icon: <Tv className="h-5 w-5" />, label: 'Power Backup' }
  ];

  // Resource selecting triggers checkups
  const handleResourceBooking = (resourceId: string) => {
    if (!currentUser) {
      toast.error('Log in to book a station slot!');
      navigate('/login', { state: { from: `/venue/${venue.id}` } });
    } else {
      navigate(`/booking/${venue.id}?resourceId=${resourceId}`);
    }
  };

  // Multi-star breakdown count calculator
  const starBreakdowns = [5, 4, 3, 2, 1].map(starValue => {
    const total = venueReviews.length;
    if (total === 0) return { star: starValue, pct: 0, count: 0 };
    const starMatches = venueReviews.filter(r => r.rating === starValue).length;
    return {
      star: starValue,
      pct: Math.floor((starMatches / total) * 100),
      count: starMatches
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans select-none text-white pb-20">
      
      {/* 1. TOP GALLERY SECTION */}
      <div className="space-y-4 mb-8">
        <div className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9] border border-[#2a2a3e] bg-[#0A0A0F]">
          <img 
            src={activeImage || venue.cover_image || ''} 
            alt={venue.name} 
            className="w-full h-full object-cover transition-all"
            referrerPolicy="no-referrer"
          />

          {/* Action pills overlay */}
          <div className="absolute bottom-4 right-4 flex gap-3 text-sm">
            <button 
              onClick={handleShare}
              className="px-4 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-lg font-semibold flex items-center gap-2 border border-white/10"
            >
              <Share2 className="h-4 w-4 text-brand-cyan" />
              <span>Share</span>
            </button>
            <a 
              href={getDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 rounded-lg font-semibold flex items-center gap-2 shadow-md hidden sm:flex"
            >
              <MapPin className="h-4 w-4" />
              <span>Get Directions</span>
            </a>
          </div>
        </div>

        {/* Thumbnail grid list */}
        {venue.gallery_images && venue.gallery_images.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {[venue.cover_image, ...venue.gallery_images].filter(Boolean).slice(0, 6).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img!)}
                className={`aspect-video rounded-lg overflow-hidden border-2 bg-card-dark cursor-pointer transition ${activeImage === img ? 'border-brand-purple shadow-md shadow-brand-purple/20' : 'border-[#2a2a3e] hover:border-text-secondary'}`}
              >
                <img 
                  src={img!} 
                  alt="Thumb" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. TWO COLUMN MATRIX LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* LEFT COLUMN: DESCRIPTION, STATIONS, REVIEWS (2/3 width) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Header titles */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-brand-purple/15 text-brand-purple border border-brand-purple/25 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full font-mono">
                {venue.type === 'both' ? 'Hybrid Arena' : venue.type.replace('_', ' ')}
              </span>
              {venue.is_verified && (
                <span className="bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/25 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full font-mono flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>✓ Verified</span>
                </span>
              )}
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full font-mono ${openTimeStatus.open ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {openTimeStatus.status}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight text-white mb-2">{venue.name}</h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm sm:text-base text-text-secondary">
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="text-white font-bold text-base">{venue.rating || 'New'}</span>
                <span>({venueReviews.length ? `${venueReviews.length} plays submitted` : '0 reviews yet'})</span>
              </div>
              <span className="hidden sm:inline text-text-secondary">•</span>
              <p className="flex items-start gap-1">
                <MapPin className="h-4.5 w-4.5 text-brand-purple flex-shrink-0" />
                <span className="text-white font-medium">{venue.address}, {venue.city}</span>
              </p>
            </div>
          </div>

          {/* Description text block */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-display tracking-tight text-white">About the Arena</h3>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed">{venue.description}</p>
          </div>

          {/* AMENITIES */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-display tracking-tight text-white">Amenities Offered</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {amenitiesList.map(am => {
                const isAvail = venue.amenities.some(item => item.toLowerCase() === am.key.toLowerCase());
                return (
                  <div 
                    key={am.key} 
                    className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center gap-2 transition ${isAvail ? 'bg-[#12121A] border-[#2a2a3e] text-white' : 'border-transparent text-text-secondary/30 bg-[#08080f]/40 cursor-not-allowed'}`}
                  >
                    <div className={isAvail ? 'text-brand-purple' : 'text-text-secondary/20'}>
                      {am.icon}
                    </div>
                    <span className="text-xs font-semibold">{am.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GAMES AVAILABLE */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-display tracking-tight text-white">Supported Games & Sports</h3>
            <div className="flex flex-wrap gap-2.5">
              {venue.games_available.map((gm, idx) => (
                <span 
                  key={idx} 
                  className="bg-card-dark border border-border-dark px-4 py-2 rounded-xl text-sm font-semibold capitalize text-brand-cyan hover:border-brand-cyan transition"
                >
                  {gm === 'csgo' ? 'CS:GO' : (gm === 'bgmi' ? 'BGMI' : gm)}
                </span>
              ))}
            </div>
          </div>

          {/* STATIONS/RESOURCES SECTION */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold font-display tracking-tight text-white">Choose Your Station / Pitch</h3>
            <div className="space-y-4">
              {venueResources.length === 0 ? (
                <div className="bg-[#12121A] p-6 text-center text-text-secondary text-sm border border-border-dark rounded-xl">
                  No stations are currently active or listed for online booking.
                </div>
              ) : (
                venueResources.map((res, i) => (
                  <div key={res.id} className="glass-card p-6 flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center">
                    <div className="space-y-2 flex-grow">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-purple/10 text-brand-purple rounded-lg">
                          {res.type === 'pc' ? <Cpu className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                        </div>
                        <h4 className="font-bold text-lg font-display">{res.name}</h4>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed bg-black/30 p-3 rounded-lg max-w-xl font-mono">
                        {res.specifications || 'Standard elite-class station configurations apply.'}
                      </p>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 flex-shrink-0 pt-4 sm:pt-0 border-t sm:border-none border-border-dark">
                      <div>
                        <span className="text-[10px] text-text-secondary font-mono uppercase block sm:text-right">HOURLY RATE</span>
                        <p className="text-2xl font-black font-mono text-white">₹{res.price_per_hour}</p>
                      </div>

                      <button
                        onClick={() => handleResourceBooking(res.id)}
                        className="py-3 px-6 btn-gradient text-sm shadow-md"
                      >
                        Select & Book
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ACTIVE OFFERS SECTION */}
          {venueOffers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                <Tag className="h-5 w-5 text-yellow-500" />
                <span>Current Offers 🏷️</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venueOffers.map(off => (
                  <div key={off.id} className="bg-[#12121A] border border-dashed border-brand-purple/40 p-5 rounded-xl space-y-2">
                    <h4 className="font-bold text-brand-cyan tracking-tight">{off.title}</h4>
                    <p className="text-xs text-text-secondary leading-normal">{off.description || 'Exclusive discounts on select booking hours.'}</p>
                    <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-[#2a2a3e]">
                      <span className="text-brand-green font-mono uppercase">
                        {off.discount_type === 'percentage' ? `${off.discount_value}% OFF` : `₹${off.discount_value} FLAT Discount`}
                      </span>
                      <span className="text-text-secondary font-mono">Min {off.min_booking_hours} Hr plays</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REVIEWS DISSECTIONS */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold font-display tracking-tight text-white">What People Say</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-[#12121A] p-6 border border-[#2a2a3e] rounded-xl">
              
              {/* Avg Panel */}
              <div className="text-center md:border-r border-border-dark md:pr-4 py-3">
                <p className="text-5xl font-black font-display text-white">{venue.rating || 'New'}</p>
                <div className="flex justify-center my-2 text-yellow-500">
                  <Star className="h-6 w-6 fill-yellow-500" />
                  <Star className="h-6 w-6 fill-yellow-500" />
                  <Star className="h-6 w-6 fill-yellow-500" />
                  <Star className="h-6 w-6 fill-yellow-500" />
                  <Star className="h-6 w-6 fill-yellow-500" />
                </div>
                <p className="text-xs text-text-secondary uppercase tracking-wider font-mono">Based on {venueReviews.length} plays</p>
              </div>

              {/* Breakdown Bars */}
              <div className="md:col-span-2 space-y-2 text-sm text-text-secondary">
                {starBreakdowns.map(row => (
                  <div key={row.star} className="flex items-center gap-3">
                    <span className="w-10 font-bold font-mono text-xs">{row.star} Star</span>
                    <div className="flex-grow h-2 bg-[#161622] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-purple rounded-full" 
                        style={{ width: `${row.pct}%` }}
                      ></div>
                    </div>
                    <span className="w-10 text-right text-xs font-mono">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Reviews Cards */}
            <div className="space-y-4">
              {venueReviews.length === 0 ? (
                <div className="text-center text-text-secondary text-sm py-4">
                  No reviews submitted yet. Book and be the first to share your gameplay experiences!
                </div>
              ) : (
                venueReviews.map(rev => (
                  <div key={rev.id} className="p-6 bg-[#08080f]/60 border border-border-dark rounded-xl space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {/* Masked name e.g. Karan M. */}
                        <p className="font-bold text-white text-base">Player Anonymous</p>
                        <p className="text-xs text-text-secondary font-mono">{rev.created_at}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#12121A] border border-[#2a2a3e] px-2.5 py-1 rounded">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-white">{rev.rating}</span>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-text-secondary leading-relaxed bg-black/10 p-3.5 rounded-lg border border-border-dark/20 italic">
                      "{rev.comment}"
                    </p>

                    {/* Owner reply */}
                    {rev.owner_reply && (
                      <div className="ml-6 p-4 bg-brand-purple/5 border-l-2 border-brand-purple rounded-r-lg space-y-1">
                        <span className="text-xs font-mono font-bold text-brand-purple uppercase tracking-widest">OWNER RESPONSE</span>
                        <p className="text-sm text-text-secondary leading-relaxed font-medium">"{rev.owner_reply}"</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: BOOKING CONTROLLER WIDGET & STATIC MAPS (1/3 width, sticky) */}
        <aside className="lg:col-span-1 space-y-6 sticky top-24">
          
          {/* BOOK CELL WIDGET */}
          <div className="bg-card-dark border border-border-dark p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <span className="text-xs font-mono text-text-secondary uppercase">BOOK ON GARF</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black font-display text-white">₹{venue.price_per_hour}</span>
                <span className="text-xs text-text-secondary">/ starting per hour</span>
              </div>
            </div>

            {/* 7 Day Horiz date pills */}
            <div className="space-y-3">
              <span className="text-xs font-bold font-mono text-text-secondary uppercase">SECURE DATE</span>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                  const details = getDayDetails(offset);
                  const isSelected = selectedDayOffset === offset;
                  return (
                    <button
                      key={offset}
                      onClick={() => setSelectedDayOffset(offset)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[55px] font-mono border transition ${isSelected ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-[#161622] border-[#2a2a3e] text-text-secondary hover:text-white hover:border-[#33334c]'}`}
                    >
                      <span className="text-[10px] uppercase font-bold">{details.dayName}</span>
                      <span className="text-lg font-black mt-1 leading-none">{details.dayNum}</span>
                      <span className="text-[9px] uppercase font-medium text-text-secondary/80 mt-1">{details.month}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability stats helper */}
            <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold">
              <span className="text-brand-green flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-ping"></span>
                <span>Operating hours:</span>
              </span>
              <span className="text-white font-mono">{venue.operating_hours_start} to {venue.operating_hours_end}</span>
            </div>

            {/* Booking flow main checkout navigate buttons */}
            <button
              onClick={() => {
                if (!currentUser) {
                  toast.error('Verify your session first!');
                  navigate('/login', { state: { from: `/booking/${venue.id}` } });
                } else {
                  navigate(`/booking/${venue.id}?date=${getDayDetails(selectedDayOffset).dateStr}`);
                }
              }}
              className="w-full py-4 text-center font-bold text-white btn-gradient rounded-xl shadow-lg hover:shadow-brand-purple/20 transition flex items-center justify-center gap-2"
            >
              <span>Secure Booking Space</span>
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>

          {/* MAP COMPONENT HOOK BOX */}
          <div className="bg-[#12121A] border border-[#2a2a3e] p-6 rounded-2xl shadow-md space-y-4">
            <span className="text-xs font-mono text-text-secondary uppercase block">📍 ARENA COORDINATES</span>
            <div className="bg-black/40 h-40 rounded-xl relative overflow-hidden border border-border-dark flex flex-col items-center justify-center text-center p-4">
              {/* Simulated Map visual rendering */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
              
              <MapPin className="h-8 w-8 text-brand-purple animate-bounce mb-2 z-10" />
              <h4 className="font-bold text-xs sm:text-sm text-white z-10">{venue.city} GPS Quadrant</h4>
              <p className="text-xs text-text-secondary mt-1 z-10">{venue.address}</p>

              <a
                href={getDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-brand-cyan hover:underline mt-3 z-10 font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <span>Open Google Maps</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
};
