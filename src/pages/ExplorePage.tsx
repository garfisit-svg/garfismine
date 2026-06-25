import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Venue } from '../types';
import { Filter, Star, Search, MapPin, Grid, List, SlidersHorizontal, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { venues, currentUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('nearby');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile Drawer Toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Stable deterministic distance helper
  const getVenueDistance = (venue: Venue): number => {
    let hash = 0;
    for (let i = 0; i < venue.id.length; i++) {
      hash = venue.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const positiveHash = Math.abs(hash);
    return Number((0.8 + (positiveHash % 68) / 10).toFixed(1));
  };

  // Sync state with URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const cityParam = searchParams.get('city');
    if (typeParam) {
      setSelectedType(typeParam === 'gaming_cafe' ? 'gaming_cafe' : (typeParam === 'turf' ? 'turf' : 'All'));
    }
    if (cityParam) {
      setSelectedCity(cityParam);
    }
  }, [searchParams]);

  // Options Definitions
  const citiesList = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Jaipur'];
  const gamesOptions = [
    'valorant', 'csgo', 'bgmi', 'gta5', 'fifa', 'fortnite', 'minecraft', 'warzone',
    'cricket', 'football', 'badminton', 'basketball'
  ];
  const amenitiesOptions = ['wifi', 'ac', 'parking', 'food_counter', 'washroom', 'lockers', 'cctv', 'power_backup'];

  // Toggle checks helper
  const handleGameToggle = (game: string) => {
    setSelectedGames(prev =>
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const clearAllFilters = () => {
    setSelectedType('All');
    setSelectedCity('All');
    setMaxPrice(1000);
    setMinRating(0);
    setSelectedGames([]);
    setSelectedAmenities([]);
    setSortBy('nearby');
    setSearchQuery('');
    setSearchParams({});
    toast.success('Filters cleared!');
  };

  const formatKeyName = (str: string) => {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Perform client filters (Only search verified and active unless owned!)
  const filteredVenues = venues.filter(v => {
    // Standard rule: only show verified & active (not suspended) to public customers
    if (!v.is_verified || !v.is_active || v.is_suspended) {
      return false;
    }

    // Text Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesName = v.name.toLowerCase().includes(q);
      const matchesDesc = v.description.toLowerCase().includes(q);
      const matchesCity = v.city.toLowerCase().includes(q);
      const matchesAddress = v.address.toLowerCase().includes(q);
      const matchesGames = v.games_available.some(game => game.toLowerCase().includes(q));
      if (!matchesName && !matchesDesc && !matchesCity && !matchesAddress && !matchesGames) {
        return false;
      }
    }

    // City Filter
    if (selectedCity !== 'All' && v.city.toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }

    // Type Filter
    if (selectedType !== 'All') {
      if (selectedType === 'gaming_cafe' && v.type === 'turf') return false;
      if (selectedType === 'turf' && v.type === 'gaming_cafe') return false;
    }

    // Maximum Hourly Price Filter
    if (v.price_per_hour > maxPrice) {
      return false;
    }

    // Minimum Rating
    if (v.rating < minRating) {
      return false;
    }

    // Games Filter
    if (selectedGames.length > 0) {
      const hasAllGames = selectedGames.every(g => v.games_available.some(vgame => vgame.toLowerCase() === g.toLowerCase()));
      if (!hasAllGames) return false;
    }

    // Amenities Filter
    if (selectedAmenities.length > 0) {
      const hasAllAmenities = selectedAmenities.every(a => v.amenities.some(vam => vam.toLowerCase() === a.toLowerCase()));
      if (!hasAllAmenities) return false;
    }

    return true;
  });

  // Sort Logic
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    if (sortBy === 'nearby') {
      return getVenueDistance(a) - getVenueDistance(b);
    }
    // Feature priority: featured venues bubble up if Relevance selected
    if (sortBy === 'relevance') {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return b.rating - a.rating;
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    if (sortBy === 'price-asc') {
      return a.price_per_hour - b.price_per_hour;
    }
    if (sortBy === 'price-desc') {
      return b.price_per_hour - a.price_per_hour;
    }
    return 0;
  });

  // Routing to Detail vs Redirect Book Now
  const handleBookNow = (venueId: string) => {
    if (!currentUser) {
      toast.error('Log in first to secure slots!');
      navigate('/login', { state: { from: `/venue/${venueId}` } });
    } else {
      navigate(`/venue/${venueId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans select-none min-h-[90vh]">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white">Find Your Next <span className="text-gradient">Battlefield</span></h1>
          <p className="text-text-secondary text-sm sm:text-base mt-2">Discover verified computing cafes or cricket/football spots near you</p>
        </div>

        {/* Mobile quick toggles */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="md:hidden flex items-center gap-2 bg-[#12121A] border border-[#2a2a3e] px-4 py-2.5 rounded-lg text-sm text-brand-cyan"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters & Sort</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT SIDEBAR FILTERS - DESKTOP ONLY */}
        <aside className="hidden lg:block space-y-6 bg-[#0c0c14]/50 p-6 border border-[#2a2a3e] rounded-xl h-fit sticky top-24">
          <div className="flex justify-between items-center pb-4 border-b border-[#2a2a3e]">
            <span className="font-bold font-display text-lg tracking-tight flex items-center gap-2">
              <Filter className="h-5 w-5 text-brand-purple" />
              <span>Filters</span>
            </span>
            <button onClick={clearAllFilters} className="text-xs text-brand-cyan hover:underline">
              Clear All
            </button>
          </div>

          {/* Type radio */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">Category</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              {['All', 'gaming_cafe', 'turf'].map(type => (
                <label key={type} className="flex items-center gap-2.5 cursor-pointer hover:text-white transition">
                  <input
                    type="radio"
                    name="category_filter"
                    className="text-brand-purple bg-[#161622] border-[#2a2a3e]"
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                  />
                  <span>{type === 'All' ? 'All categories' : formatKeyName(type)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* City list dropdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">City</h4>
            <select
              className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-purple"
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
            >
              <option value="All">All Cities</option>
              {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Price Range range slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <h4 className="uppercase tracking-wider text-text-secondary font-mono text-sm">Hourly Budget</h4>
              <span className="text-brand-cyan">Max ₹{maxPrice}/hr</span>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={50}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand-purple bg-[#161622] rounded-lg h-2 cursor-pointer"
            />
          </div>

          {/* Minimum rating radios */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">Rating</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              {[
                { label: 'Any Rating', val: 0 },
                { label: '⭐ 3.0+ Stars', val: 3 },
                { label: '⭐ 4.0+ Stars', val: 4 },
                { label: '⭐ 4.5+ Stars', val: 4.5 }
              ].map(opt => (
                <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer hover:text-white transition">
                  <input
                    type="radio"
                    name="rating_filter"
                    className="text-brand-purple bg-[#161622] border-[#2a2a3e]"
                    checked={minRating === opt.val}
                    onChange={() => setMinRating(opt.val)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort selection dropdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">Sort By</h4>
            <select
              className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-purple"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="nearby">📍 Nearby First</option>
              <option value="relevance">Relevance</option>
              <option value="rating">Rating: High to Low</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Games Checkboxes */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">Games Offered</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 text-sm text-text-secondary">
              {gamesOptions.map(gm => (
                <label key={gm} className="flex items-center gap-2.5 cursor-pointer hover:text-white transition capitalize">
                  <input
                    type="checkbox"
                    className="rounded text-brand-purple bg-[#161622] border-[#2a2a3e]"
                    checked={selectedGames.includes(gm)}
                    onChange={() => handleGameToggle(gm)}
                  />
                  <span>{gm === 'csgo' ? 'CS:GO' : (gm === 'bgmi' ? 'BGMI' : gm)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amenities checkboxes */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-secondary font-mono">Amenities</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              {amenitiesOptions.map(am => (
                <label key={am} className="flex items-center gap-2.5 cursor-pointer hover:text-white transition capitalize">
                  <input
                    type="checkbox"
                    className="rounded text-brand-purple bg-[#161622] border-[#2a2a3e]"
                    checked={selectedAmenities.includes(am)}
                    onChange={() => handleAmenityToggle(am)}
                  />
                  <span>{am.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* RESULTS GRID COLUMN (3/4 width on large screens) */}
        <section className="lg:col-span-3 space-y-6">
          {/* SEARCH & QUICK TYPE SELECTORS */}
          <div className="bg-[#12121A]/80 border border-[#2a2a3e] p-5 rounded-2xl space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Search by arena name, address, game (e.g. valorant, cricket), city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#161622] border border-[#2a2a3e] focus:border-brand-purple focus:outline-none rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-text-secondary/60 transition font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Type Selection Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-text-secondary font-mono mr-1">QUICK CATEGORY:</span>
              {[
                { label: 'All Arenas 🌟', value: 'All' },
                { label: 'Gaming Cafes 🎮', value: 'gaming_cafe' },
                { label: 'Turf Fields ⚽', value: 'turf' }
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedType(cat.value)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition border ${
                    selectedType === cat.value
                      ? 'bg-brand-purple/20 border-brand-purple text-white'
                      : 'bg-[#161622] border-[#2a2a3e] text-text-secondary hover:text-white hover:border-[#3a3a5e]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-mono text-text-secondary bg-[#12121A] p-4 border border-[#2a2a3e] rounded-xl">
            <span>Showing {sortedVenues.length} locations matching filters</span>
            <div className="hidden sm:flex gap-2 items-center">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-[#1C1C2A] text-brand-cyan border border-brand-cyan/40' : 'text-text-secondary hover:text-white'}`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-[#1C1C2A] text-brand-cyan border border-brand-cyan/40' : 'text-text-secondary hover:text-white'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <span className="text-xs text-text-secondary/80 font-mono">
                {viewMode === 'grid' ? 'Grid view active' : 'List view active'}
              </span>
            </div>
          </div>

          {sortedVenues.length === 0 ? (
            <div className="glass-card p-16 text-center space-y-6">
              <span className="text-6xl text-text-secondary">🔍</span>
              <h3 className="text-2xl font-bold">No Venues Found</h3>
              <p className="text-text-secondary max-w-sm mx-auto text-sm">
                Try loosening your filters, widening the hourly budget slider, or selecting "All Cities" to discover active arenas!
              </p>
              <button onClick={clearAllFilters} className="px-6 py-2.5 btn-gradient font-bold rounded-lg text-sm">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
              {sortedVenues.map(ven => {
                const randDist = getVenueDistance(ven).toFixed(1);
                
                if (viewMode === 'list') {
                  return (
                    <div key={ven.id} className="glass-card overflow-hidden flex flex-col md:flex-row justify-between group md:h-52 w-full">
                      {/* Cover block */}
                      <div className="relative w-full md:w-72 h-48 md:h-full overflow-hidden flex-shrink-0">
                        <img 
                          src={ven.cover_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'} 
                          alt={ven.name} 
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {/* Badges Overlay */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2.5">
                          {ven.is_featured && (
                            <span className="bg-yellow-500/90 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-md">
                              ★ Featured
                            </span>
                          )}
                          {ven.is_verified && (
                            <span className="bg-brand-cyan/95 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span>✓ Verified</span>
                            </span>
                          )}
                        </div>
                        {/* Distance overlay */}
                        <div className="absolute bottom-3 right-3 bg-black/75 px-2.5 py-1 text-[10px] rounded-md font-mono">
                          📍 {randDist} km away
                        </div>
                      </div>

                      {/* Meta Detail block */}
                      <div className="p-5 flex-grow flex flex-col justify-between">
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-brand-purple tracking-widest font-mono">
                              {ven.type === 'both' ? 'Hybrid Arena' : FormatTypeLabel(ven.type)}
                            </span>
                            <h3 className="font-bold font-display text-lg tracking-tight text-white group-hover:text-brand-cyan transition mt-0.5 line-clamp-1">
                              {ven.name}
                            </h3>
                            <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5 capitalize">
                              <MapPin className="h-3.5 w-3.5 text-brand-purple flex-shrink-0" />
                              <span>{ven.city} • {ven.address.split(',').slice(-1)[0]}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-white">{ven.rating || 'New'}</span>
                            <span className="text-xs text-text-secondary font-mono">
                              ({ven.total_reviews ? `${ven.total_reviews} plays` : '0 reviews'})
                            </span>
                          </div>

                          {/* Games row */}
                          <div className="flex flex-wrap gap-1.5">
                            {ven.games_available.slice(0, 4).map((g, idx) => (
                              <span key={idx} className="bg-[#161622] text-xs px-2.5 py-1 rounded border border-[#2a2a3e] capitalize">
                                {g === 'csgo' ? 'CS:GO' : (g === 'bgmi' ? 'BGMI' : g)}
                              </span>
                            ))}
                            {ven.games_available.length > 4 && (
                              <span className="bg-[#161622] text-xs px-2.5 py-1 rounded border border-[#2a2a3e] font-bold text-brand-cyan">
                                +{ven.games_available.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Panel */}
                      <div className="p-5 border-t md:border-t-0 md:border-l border-[#2a2a3e]/40 flex md:flex-col justify-between md:justify-center items-center md:items-end gap-4 bg-[#0d0d15]/40 md:w-48 flex-shrink-0">
                        <div className="md:text-right">
                          <span className="text-[10px] text-text-secondary font-mono block">STARTING RATE</span>
                          <p className="text-md font-extrabold text-white font-mono">₹{ven.price_per_hour}/hr</p>
                        </div>

                        <button
                          onClick={() => handleBookNow(ven.id)}
                          className="py-2.5 px-5 btn-gradient text-xs font-bold leading-none w-full md:w-auto"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={ven.id} className="glass-card overflow-hidden flex flex-col justify-between group h-full">
                    
                    {/* Cover block */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img 
                        src={ven.cover_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'} 
                        alt={ven.name} 
                        className="object-cover w-full h-full group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />

                      {/* Badges Overlay */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2.5">
                        {ven.is_featured && (
                          <span className="bg-yellow-500/90 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-md">
                            ★ Featured
                          </span>
                        )}
                        {ven.is_verified && (
                          <span className="bg-brand-cyan/95 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span>✓ Verified</span>
                          </span>
                        )}
                      </div>

                      {/* Distance overlay */}
                      <div className="absolute bottom-3 right-3 bg-black/75 px-2.5 py-1 text-[10px] rounded-md font-mono">
                        📍 {randDist} km away
                      </div>
                    </div>

                    {/* Meta Detail block */}
                    <div className="p-5 flex-grow space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-brand-purple tracking-widest font-mono">
                          {ven.type === 'both' ? 'Hybrid Arena' : FormatTypeLabel(ven.type)}
                        </span>
                        <h3 className="font-bold font-display text-lg tracking-tight text-white group-hover:text-brand-cyan transition mt-1 line-clamp-1">
                          {ven.name}
                        </h3>
                        <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-1 capitalize">
                          <MapPin className="h-3.5 w-3.5 text-brand-purple flex-shrink-0" />
                          <span>{ven.city} • {ven.address.split(',').slice(-1)[0]}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-white">{ven.rating || 'New'}</span>
                        <span className="text-xs text-text-secondary font-mono">
                          ({ven.total_reviews ? `${ven.total_reviews} plays` : '0 reviews'})
                        </span>
                      </div>

                      {/* Games row */}
                      <div className="flex flex-wrap gap-1.5">
                        {ven.games_available.slice(0, 3).map((g, idx) => (
                          <span key={idx} className="bg-[#161622] text-xs px-2.5 py-1 rounded border border-[#2a2a3e] capitalize">
                            {g === 'csgo' ? 'CS:GO' : (g === 'bgmi' ? 'BGMI' : g)}
                          </span>
                        ))}
                        {ven.games_available.length > 3 && (
                          <span className="bg-[#161622] text-xs px-2.5 py-1 rounded border border-[#2a2a3e] font-bold text-brand-cyan">
                            +{ven.games_available.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="p-5 pt-0 border-t border-[#2a2a3e]/40 flex justify-between items-center bg-[#0d0d15]/40 mt-auto">
                      <div>
                        <span className="text-[10px] text-text-secondary font-mono block">STARTING RATE</span>
                        <p className="text-md font-extrabold text-white font-mono">₹{ven.price_per_hour}/hr</p>
                      </div>

                      <button
                        onClick={() => handleBookNow(ven.id)}
                        className="py-2.5 px-5 btn-gradient text-xs font-bold leading-none "
                      >
                        Book Now
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* 📱 MOBILE FILTERS BOTTOM SHEET DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:hidden leading-normal">
          <div className="w-full bg-card-dark border-t border-[#2a2a3e] rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-border-dark">
              <span className="font-bold text-lg font-display text-brand-purple flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" />
                <span>Filters & Sorting</span>
              </span>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 rounded bg-[#161622] text-text-secondary hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type Option */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-brand-cyan tracking-wider font-mono">Category</h4>
              <div className="flex flex-wrap gap-2">
                {['All', 'gaming_cafe', 'turf'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 border rounded-full text-xs font-semibold ${selectedType === type ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-[#2a2a3e] bg-[#161622] text-text-secondary'}`}
                  >
                    {type === 'All' ? 'All' : formatKeyName(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* City Selection */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-brand-cyan tracking-wider font-mono">City</h4>
              <select
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-sm text-white focus:outline-none"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
              >
                <option value="All">All Cities</option>
                {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Price Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-text-secondary">MAX BUDGET</span>
                <span className="text-white">₹{maxPrice}/hr</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-purple bg-[#161622]"
              />
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-brand-cyan tracking-wider font-mono">Min Rating</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Any', val: 0 },
                  { label: '3.0+', val: 3 },
                  { label: '4.0+', val: 4 },
                  { label: '4.5+', val: 4.5 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setMinRating(opt.val)}
                    className={`px-4 py-2 border rounded-full text-xs font-semibold ${minRating === opt.val ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-[#2a2a3e] bg-[#161622] text-text-secondary'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold text-brand-cyan tracking-wider font-mono">Sort Order</h4>
              <select
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-sm text-white"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="nearby">📍 Nearby First</option>
                <option value="relevance">Relevance</option>
                <option value="rating">Rating: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => { clearAllFilters(); setIsMobileFilterOpen(false); }}
                className="w-1/3 py-3 border border-[#2a2a3e] rounded-lg text-sm font-semibold hover:bg-[#161622]"
              >
                Clear
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-2/3 py-3 btn-gradient text-sm font-bold shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple label formatter
function FormatTypeLabel(type: string) {
  if (type === 'gaming_cafe') return '🎮 Gaming Cafe';
  if (type === 'turf') return '⚽ Sports Turf';
  return type;
}
