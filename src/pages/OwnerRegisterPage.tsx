import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building2, MapPin, Gamepad, Info, ArrowRight, Sparkles, User, Mail, Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export const OwnerRegisterPage: React.FC = () => {
  const { currentUser, signUp, logIn, registerVenue, detectedCity, updateProfile } = useApp();
  const navigate = useNavigate();

  // Auth States for logged out users
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Venue Registration States
  const [step, setStep] = useState(1);
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState<'gaming_cafe' | 'turf'>('gaming_cafe');
  const [description, setDescription] = useState('');
  const [venuePhone, setVenuePhone] = useState('');
  const [venueEmail, setVenueEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(detectedCity || 'Mumbai');
  const [pincode, setPincode] = useState('');
  const [upiId, setUpiId] = useState(currentUser?.upi_id || '');

  useEffect(() => {
    if (detectedCity) {
      setCity(detectedCity);
    }
  }, [detectedCity]);
  const [basePrice, setBasePrice] = useState(150);
  const [operatingHoursStart, setOperatingHoursStart] = useState('09:00');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('23:00');
  
  // Resources initial list
  const [resourceNames, setResourceNames] = useState<string[]>(['Station 1', 'Station 2']);
  const [resourceSpecs, setResourceSpecs] = useState<string[]>([
    'RTX 3060, Intel i5, 16GB RAM, 144Hz Monitor', 
    'RTX 3060, Intel i5, 16GB RAM, 144Hz Monitor'
  ]);

  const [bulkPCs, setBulkPCs] = useState<number>(5);
  const [bulkPS5s, setBulkPS5s] = useState<number>(3);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  const handleApplyBulkGenerator = () => {
    const names: string[] = [];
    const specs: string[] = [];
    
    for (let i = 1; i <= bulkPCs; i++) {
      names.push(`Gaming PC Station ${i}`);
      specs.push('RTX 4060 Ti, Intel i7, 16GB RAM, 165Hz Monitor');
    }
    for (let i = 1; i <= bulkPS5s; i++) {
      names.push(`PS5 Console Booth ${i}`);
      specs.push('PlayStation 5 Console, DualSense Controller, 4K HDR TV');
    }
    
    if (names.length === 0) {
      toast.error('Please input a valid count of PCs or PS5s');
      return;
    }
    
    setResourceNames(names);
    setResourceSpecs(specs);
    toast.success(`Generated ${bulkPCs} PCs and ${bulkPS5s} PS5 stations bulk layout!`);
    setShowBulkGenerator(false);
  };

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['wifi', 'parking', 'ac']);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
        if (!fullName || !email || !phone || !password) {
          toast.error('All fields are required for sign up');
          setLoading(false);
          return;
        }
        await signUp({
          full_name: fullName,
          email,
          phone,
          password
        });
        toast.success(`Account created! Let's register your physical arena.`);
      } else {
        if (!email || !password) {
          toast.error('Please input your email & password');
          setLoading(false);
          return;
        }
        await logIn(email);
        toast.success(`Log in verified! Continuing venue registration.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const addResourceRow = () => {
    setResourceNames([...resourceNames, `Station ${resourceNames.length + 1}`]);
    setResourceSpecs([...resourceSpecs, venueType === 'gaming_cafe' ? 'RTX 3060, Intel i5, 16GB RAM' : 'Flood lights, synthetic grass']);
  };

  const removeResourceRow = (index: number) => {
    if (resourceNames.length <= 1) return;
    setResourceNames(resourceNames.filter((_, i) => i !== index));
    setResourceSpecs(resourceSpecs.filter((_, i) => i !== index));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueName || !address || !description || !venuePhone || !venueEmail) {
      toast.error('Please fill in all core venue parameters');
      return;
    }

    try {
      setLoading(true);
      
      if (upiId.trim()) {
        if (!upiId.includes('@')) {
          toast.error('Please enter a valid UPI ID (e.g. name@okaxis)');
          setLoading(false);
          return;
        }
        updateProfile({ upi_id: upiId.trim() });
      }

      const venueData = {
        name: venueName,
        type: venueType,
        address,
        city,
        pincode: pincode || '400001',
        phone: venuePhone || phone || '9999999999',
        email: venueEmail || email || 'owner@arena.com',
        description,
        price_per_hour: Number(basePrice) || 150,
        cover_image: venueType === 'gaming_cafe'
          ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'
          : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800',
        games_available: venueType === 'gaming_cafe' ? ['valorant', 'csgo', 'gta5'] : ['football', 'cricket'],
        amenities: selectedAmenities,
        state: 'Maharashtra',
        operating_hours_start: operatingHoursStart,
        operating_hours_end: operatingHoursEnd,
        operating_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        gallery_images: []
      };

      const resourcesData = resourceNames.map((name, i) => ({
        name,
        type: venueType === 'gaming_cafe' ? ('pc' as const) : ('turf' as const),
        price_per_hour: Number(basePrice) || 150,
        is_active: true,
        specifications: resourceSpecs[i] || 'High performance rig details'
      }));

      await registerVenue(venueData, resourcesData);
      
      toast.success('🎉 Register successful! Arena is live and verified.', { duration: 6000 });
      navigate('/owner-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit registration form');
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* LOGO AND TITLE */}
        <div className="text-center mb-10">
          <span className="text-sm font-mono uppercase bg-brand-purple/10 border border-brand-purple/20 text-brand-purple px-3 py-1 rounded-full font-bold tracking-widest inline-block mb-3">
            GARF Arena Partnership
          </span>
          <h1 className="text-4xl font-display font-black tracking-tight sm:text-5xl">
            List Your Arena & <span className="text-gradient">Maximize Occupancy</span>
          </h1>
          <p className="text-text-secondary mt-3 sm:text-lg max-w-2xl mx-auto">
            Bring high-density customer flows to your gaming cafe, VR hub, esports lounge, or console arcade.
          </p>
        </div>

        {/* IF USER NOT AUTHENTICATED */}
        {!currentUser ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
            {/* Value Proposition */}
            <div className="md:col-span-5 bg-[#12121A] border border-[#2a2a3e] p-8 rounded-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold font-display text-white">Why partner with GARF?</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="p-2 h-max bg-brand-purple/10 rounded-lg text-brand-purple font-black">✓</div>
                    <div>
                      <h4 className="font-bold text-sm">30% Token Advance Lock-In</h4>
                      <p className="text-xs text-text-secondary mt-0.5">Secure partial advance payment for offline bookings. Cancel payouts are fully protected.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-2 h-max bg-brand-cyan/10 rounded-lg text-brand-cyan font-black">✓</div>
                    <div>
                      <h4 className="font-bold text-sm">Automated Pay-At-Venue holds</h4>
                      <p className="text-xs text-text-secondary mt-0.5">15 minute grace grace period same-day holds ensure high slot recycled reuse.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="p-2 h-max bg-yellow-500/10 rounded-lg text-yellow-500 font-black">✓</div>
                    <div>
                      <h4 className="font-bold text-sm">Zero Fee Walk-In Manager</h4>
                      <p className="text-xs text-text-secondary mt-0.5">Record local cash or UPI clients directly to timeline mapping layouts without hurdles.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#2a2a3e] text-xs text-text-secondary/60">
                Already have a venue role account? Use <span className="text-brand-purple font-bold">owner@arena.com</span> to test-drive loaded configurations instantly!
              </div>
            </div>

            {/* Auth panel */}
            <div className="md:col-span-7 bg-[#1A1A2E] border border-[#2a2a3e] p-8 rounded-2xl">
              <div className="flex gap-4 border-b border-[#2a2a3e] pb-4 mb-6">
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`pb-2 font-bold text-lg border-b-2 transition ${authMode === 'signup' ? 'text-brand-purple border-brand-purple' : 'text-text-secondary border-transparent'}`}
                >
                  Create Partner Account
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className={`pb-2 font-bold text-lg border-b-2 transition ${authMode === 'login' ? 'text-brand-purple border-brand-purple' : 'text-text-secondary border-transparent'}`}
                >
                  I have an Account
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'login' && (
                  <div className="bg-[#12121A] p-1.5 rounded-xl border border-[#2a2a3e] grid grid-cols-2 gap-1.5 text-center text-[10px] sm:text-xs font-bold leading-normal mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('player@garf.com');
                        setPassword('password');
                        toast.success('Selected Player Demo Credentials!');
                      }}
                      className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer ${email === 'player@garf.com' ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow' : 'text-text-secondary hover:text-white'}`}
                    >
                      🕹️ Player Login Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('owner@arena.com');
                        setPassword('password');
                        toast.success('Selected Partner Demo Credentials!');
                      }}
                      className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer ${email === 'owner@arena.com' ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow' : 'text-text-secondary hover:text-white'}`}
                    >
                      🏢 Partner Login Demo
                    </button>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-purple"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="owner@arena.com"
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-purple"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Phone Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-purple"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Account Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-secondary">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-purple"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 btn-gradient text-white rounded-lg font-bold tracking-wider uppercase text-xs transition-transform hover:scale-101 flex justify-center items-center gap-1.5"
                >
                  {authMode === 'signup' ? 'Create Partner Profile' : 'Authenticate & Next'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* REGISTRATION MULTI-STEP FLOW FOR LOGGED-IN USERS */
          <div className="bg-[#1A1A2E] border border-[#2a2a3e] rounded-2xl p-6 sm:p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-[#2a2a3e] pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-brand-purple" />
                <h2 className="text-xl sm:text-2xl font-bold font-display">Provide Physical Arena Details</h2>
              </div>
              <div className="text-xs font-mono bg-brand-purple/10 text-brand-purple px-2 py-1 rounded">
                Verified Owner: {currentUser.full_name}
              </div>
            </div>

            {/* Stepper info banner */}
            <div className="flex justify-between text-xs sm:text-sm text-text-secondary">
              <span className={step === 1 ? 'text-brand-purple font-black' : ''}>1. Basic Identity</span>
              <span className={step === 2 ? 'text-brand-purple font-black' : ''}>2. Coordinates Location</span>
              <span className={step === 3 ? 'text-brand-purple font-black' : ''}>3. Stations & Assets</span>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              
              {/* STEP 1: IDENTITY */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Venue Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Havoc Elite Gaming Café, Hyperion Esports"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Arena Type</label>
                      <select
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple cursor-not-allowed"
                        value={venueType}
                        disabled
                      >
                        <option value="gaming_cafe">🖥️ PC Lounge / Console Gaming Café</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Arena Bio / Catchy Description</label>
                    <textarea
                      rows={3}
                      placeholder="Explain features, specs, game collection or hardware specs. Displayed transparently to players booking."
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Primary Help Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 91102 94711"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                        value={venuePhone}
                        onChange={e => setVenuePhone(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Help Desk Email</label>
                      <input
                        type="email"
                        placeholder="e.g. contact@havocgaming.com"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                        value={venueEmail}
                        onChange={e => setVenueEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* UPI DIRECT ROUTING OPTION */}
                  <div className="bg-[#12121A] border border-cyan-500/25 p-5 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-sans">
                      <span className="font-mono text-base font-black">₹</span>
                      <label className="block text-xs font-bold uppercase tracking-wider">Business UPI ID (for Direct Customer Payments)</label>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. businessname@okaxis"
                      className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-cyan-500 font-mono text-white placeholder:text-text-secondary/40"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-[#8e8ea8] leading-relaxed font-sans">
                      💡 <strong>Instant direct routing:</strong> Booking payments (including the ₹5 platform fee) are sent directly to this address.
                    </p>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!venueName || !description || !venuePhone || !venueEmail) {
                          toast.error('Identity inputs are required to proceed');
                          return;
                        }
                        setStep(2);
                      }}
                      className="btn-gradient px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Next Step (Coordinates)
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ADDRESS */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Physical Address Range</label>
                    <input
                      type="text"
                      placeholder="Street No, Building range, Landmark etc."
                      className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Operational City</label>
                      <select
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple text-white"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      >
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Bangalore">Bangalore</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Kolkata">Kolkata</option>
                        <option value="Pune">Pune</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">PIN / Area Zipcode</label>
                      <input
                        type="text"
                        placeholder="e.g. 400001"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple"
                        value={pincode}
                        onChange={e => setPincode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Base Price rating (Hourly)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 inset-y-0 flex items-center text-text-secondary font-mono">₹</span>
                        <input
                          type="number"
                          className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg pl-8 pr-4 py-3 text-sm outline-none focus:border-brand-purple"
                          value={basePrice}
                          onChange={e => setBasePrice(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Operating Hours Start (Open)</label>
                      <input
                        type="time"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple font-mono"
                        value={operatingHoursStart}
                        onChange={e => setOperatingHoursStart(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">Operating Hours End (Close)</label>
                      <input
                        type="time"
                        className="w-full bg-[#12121A] border border-[#2a2a3e] rounded-lg p-3 text-sm outline-none focus:border-brand-purple font-mono"
                        value={operatingHoursEnd}
                        onChange={e => setOperatingHoursEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Available Amenities & Conveniences</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'wifi', label: '🚀 Giga WiFi' },
                        { id: 'ac', label: '❄️ Air Conditioner' },
                        { id: 'parking', label: '🅿️ Free Parking' },
                        { id: 'food', label: '🍔 Café Counter' },
                        { id: 'power_backup', label: '🔋 UPS Backup' },
                        { id: 'washroom', label: '🚻 Clean Washroom' },
                      ].map(am => (
                        <button
                          key={am.id}
                          type="button"
                          onClick={() => toggleAmenity(am.id)}
                          className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center gap-2 ${selectedAmenities.includes(am.id) ? 'border-brand-purple bg-brand-purple/5 text-white' : 'border-border-dark text-text-secondary'}`}
                        >
                          <span>{selectedAmenities.includes(am.id) ? '●' : '○'}</span>
                          <span>{am.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!address || !city) {
                          toast.error('Address and coordinates inputs are required');
                          return;
                        }
                        setStep(3);
                      }}
                      className="btn-gradient px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Next Step (Assets Setup)
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: RESOURCES / STATIONS */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-sm text-brand-purple flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Configure Initial Station Layout Slots
                    </h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Register bookable stations now. You can customize them or add unlimited more from the Resources tab later! For example: PC-01 Core System, PS5 Console Station 1, Arcade Booth 1.
                    </p>
                  </div>

                  {/* RAPID BULK GENERATOR CARD */}
                  <div className="bg-[#12121A] border border-brand-purple/25 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowBulkGenerator(!showBulkGenerator)}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base text-brand-purple">⚡</span>
                        <div>
                          <h5 className="font-bold text-xs text-white uppercase tracking-wider">Rapid Bulk Rig Generator</h5>
                          <p className="text-[10px] text-text-secondary">Instantly create multiple PC gaming stations and PS5 consoles</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-brand-purple hover:underline font-bold">
                        {showBulkGenerator ? 'Collapse' : 'Expand Setup'}
                      </span>
                    </div>

                    {showBulkGenerator && (
                      <div className="pt-3 border-t border-[#2a2a3e] space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase font-mono text-text-secondary mb-1">Gaming PC Units</label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              className="w-full bg-[#1C1C2D] border border-border-dark rounded-lg p-2 text-white text-xs outline-none focus:border-brand-purple font-mono"
                              value={bulkPCs}
                              onChange={e => setBulkPCs(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-mono text-text-secondary mb-1">PS5 Console Units</label>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              className="w-full bg-[#1C1C2D] border border-border-dark rounded-lg p-2 text-white text-xs outline-none focus:border-brand-purple font-mono"
                              value={bulkPS5s}
                              onChange={e => setBulkPS5s(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyBulkGenerator}
                          className="w-full py-2 bg-brand-purple hover:bg-brand-purple/95 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition"
                        >
                          ⚡ Generate {bulkPCs + bulkPS5s} Stations Bulk Layout
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {resourceNames.map((name, idx) => (
                      <div key={idx} className="flex gap-3 items-start bg-[#12121A] border border-border-dark p-4 rounded-xl relative">
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Station/Rig Label</label>
                            <input
                              type="text"
                              value={name}
                              onChange={e => {
                                const copy = [...resourceNames];
                                copy[idx] = e.target.value;
                                setResourceNames(copy);
                              }}
                              className="w-full bg-[#1C1C2D] border border-border-dark rounded-lg p-2 text-xs outline-none"
                              placeholder="e.g. PC 1, PS5 Console Booth A"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">Hardware / Court Specs</label>
                            <input
                              type="text"
                              value={resourceSpecs[idx]}
                              onChange={e => {
                                const copy = [...resourceSpecs];
                                copy[idx] = e.target.value;
                                setResourceSpecs(copy);
                              }}
                              className="w-full bg-[#1C1C2D] border border-border-dark rounded-lg p-2 text-xs outline-none"
                              placeholder="e.g. RTX 4060, Intel i7, 16GB RAM, or PS5 Slim"
                              required
                            />
                          </div>
                        </div>

                        {resourceNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeResourceRow(idx)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold pt-6 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addResourceRow}
                    className="py-2.5 px-4 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-border-dark transition flex items-center gap-1.5"
                  >
                    <span>＋ Add Another bookable Station</span>
                  </button>

                  <div className="pt-6 border-t border-[#2a2a3e] flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-[#12121A] border border-[#2a2a3e] rounded-lg text-xs font-bold uppercase text-text-secondary hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-gradient px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-purple/20 flex items-center gap-2"
                    >
                      {loading ? 'Publishing Venue...' : 'Register Venue & Launch Console! 🚀'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
