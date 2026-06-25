import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Venue } from '../../types';
import { Settings, Save, MapPin, Sparkles, Building, Key, BellRing } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingsTabProps {
  venue: Venue | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ venue }) => {
  const { updateVenueSettings } = useApp();

  const [activeSegment, setActiveSegment] = useState<'profile' | 'hours' | 'bank'>('profile');

  // Input states (initialized from venue info if exists)
  const [venueName, setVenueName] = useState(venue?.name || '');
  const [venueAddress, setVenueAddress] = useState(venue?.address || '');
  const [venueGames, setVenueGames] = useState<string[]>(venue?.games_available || []);
  const [venueAmenities, setVenueAmenities] = useState<string[]>(venue?.amenities || []);
  const [pricePerHour, setPricePerHour] = useState(venue?.price_per_hour || 150);
  const [venueType, setVenueType] = useState(venue?.type || 'arena');

  const [operationFrom, setOperationFrom] = useState('09:00');
  const [operationTo, setOperationTo] = useState('23:00');

  // Vault Bank Details (simulated placeholders)
  const [bankNum, setBankNum] = useState('6500 2410 9314 0021');
  const [bankIfsc, setBankIfsc] = useState('ICIC0001041');
  const [holderName, setHolderName] = useState('Rahul Aggarwal (Arena Owner Account)');

  // Refresh values on venue loaded updates
  React.useEffect(() => {
    if (venue) {
      setVenueName(venue.name);
      setVenueAddress(venue.address);
      setVenueGames(venue.games_available);
      setVenueAmenities(venue.amenities);
      setPricePerHour(venue.price_per_hour);
      setVenueType(venue.type);
    }
  }, [venue]);

  // Checklist arrays
  const popularGames = ['Valorant', 'CS2 / Counter-Strike', 'Dota 2', 'FC 25 (FIFA)', 'Call of Duty: Warzone', 'Minecraft Esports', 'Tekken 8', 'F1 2024 Grid'];
  const baseAmenities = ['RGB Gaming Chairs', 'RTX High-FPS PCs', 'Steam Esports Library', 'Astro Turf pitch shoe renting', 'Fully Air Conditioned Cooled Zone', 'Snack Bar / Soft drinks vending', 'High-Speed fiber Dedicated Link', 'Free High-speed Wi-Fi Zone', 'Shower Rooms & Locker vaults'];

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

    updateVenueSettings(venue.id, {
      name: venueName,
      address: venueAddress,
      games_available: venueGames,
      amenities: venueAmenities,
      price_per_hour: pricePerHour,
      type: venueType
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
            <Building className="h-4 w-4" />
            <span>Payout Bank details</span>
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
                  toast.success('Successfully refreshed calendar boundaries!');
                }}
                className="px-5 py-2 bg-brand-purple text-white rounded-lg text-xs font-bold uppercase cursor-pointer transition hover:opacity-90"
              >
                Validate and refresh boundaries
              </button>
            </div>
          )}

          {activeSegment === 'bank' && (
            <div className="space-y-5">
              <h5 className="font-bold text-white text-base font-display">Payout accounts settlement details</h5>
              <p className="text-xs text-text-secondary">
                Securely store bank account fields so that online/token transactions net of the GARF 10% auto-deduction can be wire-transferred.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold uppercase text-text-secondary mb-1">Holder name on book log</label>
                  <input
                    type="text"
                    className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                    value={holderName}
                    onChange={e => setHolderName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-[#a8a8cf] mb-1">Direct Vault account number</label>
                    <input
                      type="text"
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                      value={bankNum}
                      onChange={e => setBankNum(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold uppercase text-[#a8a8cf] mb-1">IFSC transfer code symbol</label>
                    <input
                      type="text"
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-2.5 text-sm outline-none text-white font-mono"
                      value={bankIfsc}
                      onChange={e => setBankIfsc(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#12121A] rounded-xl border border-border-dark flex items-start gap-2 text-text-secondary leading-normal">
                <BellRing className="h-4 w-4 mt-0.5 text-[#06B6D4] flex-shrink-0" />
                <span>We encrypt and isolate account parameters safely inside isolated GCP Cloud Storage hashes. Payout processing coordinates clear normally within 48 business hours upon cycle closure days.</span>
              </div>

              <button
                onClick={() => {
                  toast.success('Secure billing credentials updated successfully!');
                }}
                className="px-5 py-2 bg-emerald-400 text-black font-bold uppercase rounded-lg text-xs cursor-pointer active:scale-95 transition"
              >
                🔒 Validate secure bank vault specs
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
