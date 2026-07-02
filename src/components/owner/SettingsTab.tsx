import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue } from '../../types';
import { Settings, Save, MapPin, Sparkles, Building, Key, BellRing, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsTabProps {
  venue: Venue | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ venue }) => {
  const { currentUser, updateProfile, updateVenue, deleteVenue } = useApp();

  const [activeSegment, setActiveSegment] = useState<'profile' | 'hours' | 'bank' | 'closed-dates' | 'danger'>('profile');

  // Input states (initialized from venue info if exists)
  const [venueName, setVenueName] = useState(venue?.name || '');
  const [venueAddress, setVenueAddress] = useState(venue?.address || '');
  const [venueGames, setVenueGames] = useState<string[]>(venue?.games_available || []);
  const [venueAmenities, setVenueAmenities] = useState<string[]>(venue?.amenities || []);
  const [pricePerHour, setPricePerHour] = useState(venue?.price_per_hour || 150);
  const [venueType, setVenueType] = useState(venue?.type || 'arena');

  const [operationFrom, setOperationFrom] = useState(venue?.operating_hours_start || '09:00');
  const [operationTo, setOperationTo] = useState(venue?.operating_hours_end || '23:00');

  // Closed dates state
  const [closedDates, setClosedDates] = useState<string[]>(venue?.closed_dates || []);
  const [newClosedDate, setNewClosedDate] = useState('');

  // UPI configuration state
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');

  // Refresh values on venue loaded updates
  React.useEffect(() => {
    if (venue) {
      setVenueName(venue.name);
      setVenueAddress(venue.address);
      setVenueGames(venue.games_available);
      setVenueAmenities(venue.amenities);
      setPricePerHour(venue.price_per_hour);
      setVenueType(venue.type);
      setOperationFrom(venue.operating_hours_start || '09:00');
      setOperationTo(venue.operating_hours_end || '23:00');
      setClosedDates(venue.closed_dates || []);
    }
  }, [venue]);

  // Sync UPI id when currentUser changes
  React.useEffect(() => {
    if (currentUser?.upi_id) {
      setUpiId(currentUser.upi_id);
    }
  }, [currentUser]);

  // Checklist arrays
  const popularGames = ['Valorant', 'CS2 / Counter-Strike', 'Dota 2', 'FC 25 (FIFA)', 'Call of Duty: Warzone', 'Minecraft Esports', 'Tekken 8', 'F1 2024 Grid'];
  const baseAmenities = ['RGB Gaming Chairs', 'RTX High-FPS PCs', 'Steam Esports Library', 'Console controller renting', 'Fully Air Conditioned Cooled Zone', 'Snack Bar / Soft drinks vending', 'High-Speed fiber Dedicated Link', 'Free High-speed Wi-Fi Zone', 'Shower Rooms & Locker vaults'];

  const toggleGame = (game: string) => {
    setVenueGames(prev =>
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
  };

  const toggleAmenity = (amenity: string) => {
    setVenueAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;

    updateVenue(venue.id, {
      name: venueName,
      address: venueAddress,
      games_available: venueGames,
      amenities: venueAmenities,
      price_per_hour: pricePerHour,
      type: venueType as 'gaming_cafe' | 'turf' | 'both'
    });

    toast.success('Venue configuration settings updated successfully!');
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#12121A] p-5 rounded-2xl border border-border-dark">
        <div>
          <h4 className="font-bold font-display text-white text-base">Venue Settings Control</h4>
          <p className="text-xs text-text-secondary">Keep specifications current for player catalogs maps and booking advance payments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* SMALL SEGMENT TABS LEFT PILE */}
        <div className="md:col-span-3 bg-[#1A1A2E] border border-border-dark p-4 rounded-2xl flex flex-row md:flex-col gap-2 overflow-x-auto min-w-max md:min-w-0">
          
          <button
            onClick={() => setActiveSegment('profile')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer flex-1 md:flex-initial ${activeSegment === 'profile' ? 'bg-[#7C3AED]/20 text-white border-l-2 border-brand-purple' : 'text-text-secondary hover:text-white'}`}
          >
            <Settings className="h-4 w-4" />
            <span>Profile & Specifications</span>
          </button>

          <button
            onClick={() => setActiveSegment('hours')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer flex-1 md:flex-initial ${activeSegment === 'hours' ? 'bg-[#7C3AED]/20 text-white border-l-2 border-brand-purple' : 'text-text-secondary hover:text-white'}`}
          >
            <MapPin className="h-4 w-4" />
            <span>Operating hours & maps</span>
          </button>

          <button
            onClick={() => setActiveSegment('bank')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer flex-1 md:flex-initial ${activeSegment === 'bank' ? 'bg-[#7C3AED]/20 text-white border-l-2 border-brand-purple' : 'text-text-secondary hover:text-white'}`}
          >
            <Settings className="h-4 w-4" />
            <span>UPI Payout ID</span>
          </button>

          <button
            onClick={() => setActiveSegment('closed-dates')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer flex-1 md:flex-initial ${activeSegment === 'closed-dates' ? 'bg-[#7C3AED]/20 text-white border-l-2 border-brand-purple' : 'text-text-secondary hover:text-white'}`}
          >
            <Calendar className="h-4 w-4" />
            <span>Closed Dates / Holidays</span>
          </button>

          <button
            onClick={() => setActiveSegment('danger')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer flex-1 md:flex-initial ${activeSegment === 'danger' ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500' : 'text-red-400/70 hover:text-red-400'}`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Danger Zone (Delete)</span>
          </button>

        </div>

        {/* DETAILS SECTION */}
        <div className="md:col-span-9 bg-[#1A1A2E] border border-border-dark p-6 rounded-2xl font-sans text-xs">
          
          {activeSegment === 'profile' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h5 className="font-bold text-white text-base font-display">Profiling catalog details</h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Corporate Arena Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Base hourly rate price (₹)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple font-mono"
                    value={pricePerHour}
                    onChange={e => setPricePerHour(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Physical Location Address</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white focus:border-brand-purple"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                />
              </div>

              {/* games selection checklist */}
              <div className="space-y-2">
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Interactive Games catalog Selection Checklist</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {popularGames.map(game => {
                    const checked = venueGames.includes(game);
                    return (
                      <button
                        type="button"
                        key={game}
                        onClick={() => toggleGame(game)}
                        className={`p-2.5 rounded-lg text-left text-xs transition font-semibold border flex justify-between items-center cursor-pointer ${checked ? 'bg-[#7C3AED]/20 border-brand-purple text-white' : 'bg-[#12121A] border-[#2A2A3E] text-text-secondary'}`}
                      >
                        <span>{game}</span>
                        <span>{checked ? '✓' : '＋'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* amenities selection checklist */}
              <div className="space-y-2">
                <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Interactive Amenities Checklist</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {baseAmenities.map(amenity => {
                    const checked = venueAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2.5 rounded-lg text-left text-xs transition font-semibold border flex justify-between items-center cursor-pointer ${checked ? 'bg-[#7C3AED]/20 border-brand-purple text-white' : 'bg-[#12121A] border-[#2A2A3E] text-text-secondary'}`}
                      >
                        <span>{amenity}</span>
                        <span>{checked ? '✓' : '＋'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-border-dark/40 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg btn-gradient text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer uppercase"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Venue Configurations</span>
                </button>
              </div>

            </form>
          )}

          {activeSegment === 'hours' && (
            <div className="space-y-5">
              <h5 className="font-bold text-white text-base font-display">Timing Settle Boundaries</h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Operating start hour (standard 9 AM)</label>
                  <input
                    type="time"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                    value={operationFrom}
                    onChange={e => setOperationFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Operating close hour (standard 11 PM)</label>
                  <input
                    type="time"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                    value={operationTo}
                    onChange={e => setOperationTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#12121A] border border-border-dark rounded-xl flex items-start gap-3">
                <Key className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed font-mono">
                  Changing timings triggers automated alignments on next 30 days of generated slots. Customers holding existing bookings in removed timings will be notified with full cancellations credits automatically.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!venue) return;
                  updateVenue(venue.id, {
                    operating_hours_start: operationFrom,
                    operating_hours_end: operationTo
                  });
                  toast.success('Successfully updated operating hours boundaries! 🕒');
                }}
                className="px-5 py-2.5 bg-brand-purple text-white rounded-lg text-xs font-bold uppercase cursor-pointer transition hover:opacity-90 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Save and refresh boundaries</span>
              </button>
            </div>
          )}

          {activeSegment === 'bank' && (
            <div className="space-y-5">
              <h5 className="font-bold text-white text-base font-display">UPI Configuration</h5>
              <p className="text-xs text-text-secondary">
                Configure your business UPI VPA address to receive direct customer payments instantly.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Business UPI ID (VPA)</label>
                  <input
                    type="text"
                    placeholder="e.g. owner@okhdfcbank"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#12121A] rounded-xl border border-border-dark flex items-start gap-2 text-text-secondary leading-normal">
                <BellRing className="h-4 w-4 mt-0.5 text-[#06B6D4] flex-shrink-0" />
                <span>Instant direct routing: Booking payments made by customers are sent directly to this address. Ensure your VPA is correct to avoid payment settlement delays.</span>
              </div>

              <button
                onClick={() => {
                  if (upiId.trim() && !upiId.includes('@')) {
                    toast.error('Please enter a valid UPI ID (e.g. owner@okhdfcbank)');
                    return;
                  }
                  updateProfile({ upi_id: upiId.trim() });
                  toast.success('UPI payout configuration updated successfully!');
                }}
                className="px-5 py-2.5 bg-emerald-400 text-black font-bold uppercase rounded-lg text-xs cursor-pointer active:scale-95 transition flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>Save UPI Payout ID</span>
              </button>
            </div>
          )}

          {activeSegment === 'closed-dates' && (
            <div className="space-y-6">
              <div>
                <h5 className="font-bold text-white text-base font-display">Manage Closed Dates & Holidays</h5>
                <p className="text-xs text-text-secondary mt-1">
                  Mark certain dates when your entire cafe or arena will be closed. Customers will be unable to select these dates or book any slots.
                </p>
              </div>

              <div className="bg-[#12121A] p-5 rounded-xl border border-[#2a2a3e] space-y-4">
                <h6 className="font-bold text-white text-xs uppercase tracking-wider">Declare a Closed Date</h6>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-grow">
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Select Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                      value={newClosedDate}
                      onChange={e => setNewClosedDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!venue) return;
                      if (!newClosedDate) {
                        toast.error('Please pick a date first!');
                        return;
                      }
                      if (closedDates.includes(newClosedDate)) {
                        toast.error('This date is already marked as closed!');
                        return;
                      }
                      const updatedDates = [...closedDates, newClosedDate].sort();
                      setClosedDates(updatedDates);
                      updateVenue(venue.id, { closed_dates: updatedDates });
                      toast.success(`Venue will remain closed on ${newClosedDate}!`);
                      setNewClosedDate('');
                    }}
                    className="py-3 px-5 bg-brand-purple text-white rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-brand-purple/90 transition"
                  >
                    Add Closed Date
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h6 className="font-bold text-white text-xs uppercase tracking-wider">Currently declared Closed Dates ({closedDates.length})</h6>
                {closedDates.length === 0 ? (
                  <div className="p-6 bg-[#12121A]/40 rounded-xl text-center text-text-secondary border border-dashed border-[#2a2a3e]">
                    No closed dates configured. Your venue is operating on all standard days.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {closedDates.map(date => (
                      <div key={date} className="flex justify-between items-center bg-[#12121A] border border-[#2a2a3e] p-3 rounded-lg font-mono">
                        <span className="text-white text-xs font-bold">{date}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!venue) return;
                            const updatedDates = closedDates.filter(d => d !== date);
                            setClosedDates(updatedDates);
                            updateVenue(venue.id, { closed_dates: updatedDates });
                            toast.success(`Date ${date} is now open for bookings!`);
                          }}
                          className="text-red-400 hover:text-red-300 text-[10px] uppercase font-bold"
                        >
                          Delete / Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSegment === 'danger' && (
            <div className="space-y-6">
              <h5 className="font-bold text-red-500 text-base font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Danger Zone: Deletion & Teardown</span>
              </h5>
              
              {!venue ? (
                <p className="text-text-secondary">No active venue found to delete.</p>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-2 leading-relaxed">
                    <p className="font-bold">⚠️ Warning: Permanent Action!</p>
                    <p>
                      You are about to permanently delete the arena <strong>"{venue.name}"</strong>. This will instantly remove:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>The venue listing from player browse and explore pages.</li>
                      <li>All associated gaming resources, consoles, and equipment slots.</li>
                      <li>Any active coupon codes or offers linked to this arena.</li>
                    </ul>
                    <p className="font-semibold text-[11px] uppercase tracking-wider mt-2">
                      This action cannot be undone. All active player holds will be canceled.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you absolutely sure you want to delete "${venue.name}"? This action is permanent and irreversible!`)) {
                          deleteVenue(venue.id);
                          toast.success('Venue and all slots successfully deleted! 🗑️');
                          // Redirect/reset tab or force refresh
                          setActiveSegment('profile');
                        }
                      }}
                      className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase rounded-lg text-xs cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-red-600/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Permanently Delete "{venue.name}"</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
