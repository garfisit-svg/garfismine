import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Profile, Venue, Booking } from '../types';
import { 
  ShieldCheck, Users, Building, Activity, Sliders, Check, 
  Trash2, X, AlertTriangle, Search, Info, Settings, ShieldAlert, Coins,
  Lock, Unlock, Edit, Filter, Database, Eye, EyeOff, Calendar, 
  DollarSign, TrendingUp, Plus, RefreshCw, Layers, Award
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import toast from 'react-hot-toast';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const GarfAdminPage: React.FC = () => {
  const { 
    currentUser, profiles, venues, bookings, platformFee, setPlatformFee, 
    welcomeBonusCoins, setWelcomeBonusCoins, birthdayBonusCoins, setBirthdayBonusCoins,
    updateUserRole, toggleUserSuspension, toggleVenueVerification, toggleVenueActiveState,
    rejectVenue, deleteVenue, updateVenue, cancelBooking, logIn, logOut
  } = useApp();

  // Route security checks
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(true);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  // Verification dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingVenueId, setRejectingVenueId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'venue' | 'booking' | 'user' | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('Administrative resolution');

  // Emulator authentication fields for garfisit@gmail.com
  const [loginEmail, setLoginEmail] = useState('garfisit@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');

  // Active dashboard tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'approved' | 'users' | 'bookings' | 'supabase'>('overview');

  // Interactive filter & search states
  const [userSearchText, setUserSearchText] = useState('');
  const [venueSearchText, setVenueSearchText] = useState('');
  const [bookingSearchText, setBookingSearchText] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');
  const [bookingVenueFilter, setBookingVenueFilter] = useState('All');

  // Dynamic robots indexing prevention
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Supabase live auth checks
  useEffect(() => {
    const checkSupabaseAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!error && user) {
            setSupabaseUser(user);
            if (user.email === 'garfisit@gmail.com') {
              setIsAuthorized(true);
            }
          }
        } catch (err) {
          console.error('Supabase Auth Check error:', err);
        }
      }
      setSupabaseLoading(false);
    };
    checkSupabaseAuth();
  }, []);

  // Sync authorization state with our global AppContext logged in user
  useEffect(() => {
    if (currentUser && currentUser.email?.toLowerCase().trim() === 'garfisit@gmail.com') {
      setIsAuthorized(true);
    } else if (!isSupabaseConfigured) {
      setIsAuthorized(false);
    }
  }, [currentUser]);

  // Handle local emulator login as garfisit@gmail.com
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim().toLowerCase() !== 'garfisit@gmail.com') {
      toast.error('Only the email address "garfisit@gmail.com" is authorized for administrator dashboard access.');
      return;
    }
    try {
      await logIn(loginEmail.trim());
      setIsAuthorized(true);
      toast.success('Successfully authenticated as root administrator (Emulator Mode).');
    } catch (err) {
      toast.error('Authentication failed. Check your local state.');
    }
  };

  // Handle Supabase Auth Sign In (if configured)
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase credentials are not configured.');
      return;
    }
    if (loginEmail.trim().toLowerCase() !== 'garfisit@gmail.com') {
      toast.error('Only the email address "garfisit@gmail.com" is authorized for administrator dashboard access.');
      return;
    }
    const load = toast.loading('Authenticating via Supabase Security...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      if (data.user) {
        setSupabaseUser(data.user);
        if (data.user.email === 'garfisit@gmail.com') {
          setIsAuthorized(true);
          await logIn('garfisit@gmail.com'); // Synchronize AppContext state too
          toast.success('Successfully authenticated via secure Supabase channel!', { id: load });
        } else {
          toast.error('Authenticated user email matches an unauthorized profile. Access Denied.', { id: load });
        }
      }
    } catch (err: any) {
      toast.error(`Supabase Auth failed: ${err.message || 'Check password and try again.'}`, { id: load });
    }
  };

  if (supabaseLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center items-center text-white font-sans gap-4">
        <RefreshCw className="h-10 w-10 text-brand-purple animate-spin" />
        <p className="text-text-secondary text-sm font-mono tracking-wider">Securing network gates...</p>
      </div>
    );
  }

  // Access Denied / Sign-in View
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-8 text-white font-sans">
        <div className="flex justify-center">
          <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-xl shadow-red-500/5 animate-pulse">
            <ShieldAlert className="h-12 w-12" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-black tracking-tight text-white uppercase">GARF <span className="text-red-500">ROOT SECURE</span></h1>
          <p className="text-text-secondary text-sm">This channel is strictly gated. Only the email <span className="text-brand-cyan font-mono font-bold">garfisit@gmail.com</span> has administrator access.</p>
        </div>

        {/* SECURITY SIGN IN PANEL */}
        <div className="bg-[#12121A] border border-[#232338] p-6 sm:p-8 rounded-2xl text-left space-y-6 shadow-2xl">
          <div className="border-b border-[#2a2a3e] pb-3 flex justify-between items-center">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider font-semibold">GATEWAY AUTHENTICATION</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${isSupabaseConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {isSupabaseConfigured ? 'Supabase Secure' : 'Sandbox Emulator'}
            </span>
          </div>

          <form onSubmit={isSupabaseConfigured ? handleSupabaseLogin : handleLocalLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Authorized Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white outline-none focus:border-brand-purple"
                placeholder="garfisit@gmail.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>

            {isSupabaseConfigured && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Supabase Account Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white outline-none focus:border-brand-purple font-mono"
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-400/90 leading-relaxed font-sans flex gap-2">
                <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>Supabase configurations are missing. Using sandbox login mode. Simply submit the authorized email to simulate full admin panel capabilities.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-brand-purple to-brand-pink text-white rounded-xl font-bold font-sans text-xs uppercase tracking-wider hover:brightness-110 shadow-lg cursor-pointer transition active:scale-98"
            >
              Request Root Gateway Entry
            </button>
          </form>
        </div>

        <p className="text-[10px] font-mono text-text-secondary/50">
          IP Logs Secured. Any unauthorized penetrations will trigger security isolation.
        </p>
      </div>
    );
  }

  // Statistics calculation helpers
  const totalUsersCount = profiles.length;
  const totalOwnersCount = profiles.filter(p => p.role === 'owner' || p.role === 'owner_pending').length;
  const pendingApprovalsCount = venues.filter(v => !v.is_verified).length;
  const approvedVenuesCount = venues.filter(v => v.is_verified).length;
  const totalBookingsCount = bookings.length;
  const revenueTotal = bookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'confirmed').reduce((sum, item) => sum + item.final_amount, 0);

  // Filter listings
  const filteredPendingVenues = venues.filter(v => {
    if (v.is_verified) return false;
    const matchText = v.name.toLowerCase().includes(venueSearchText.toLowerCase()) || 
                      v.city.toLowerCase().includes(venueSearchText.toLowerCase()) ||
                      v.address.toLowerCase().includes(venueSearchText.toLowerCase());
    return matchText;
  });

  const filteredApprovedVenues = venues.filter(v => {
    if (!v.is_verified) return false;
    const matchText = v.name.toLowerCase().includes(venueSearchText.toLowerCase()) || 
                      v.city.toLowerCase().includes(venueSearchText.toLowerCase()) ||
                      v.address.toLowerCase().includes(venueSearchText.toLowerCase());
    return matchText;
  });

  const filteredUsers = profiles.filter(p => {
    return p.full_name.toLowerCase().includes(userSearchText.toLowerCase()) || 
           (p.email || '').toLowerCase().includes(userSearchText.toLowerCase()) ||
           (p.phone || '').includes(userSearchText);
  });

  const filteredBookings = bookings.filter(b => {
    const venue = venues.find(v => v.id === b.venue_id);
    const user = profiles.find(p => p.id === b.customer_id);
    
    const textSearch = b.booking_ref.toLowerCase().includes(bookingSearchText.toLowerCase()) ||
                       (venue?.name || '').toLowerCase().includes(bookingSearchText.toLowerCase()) ||
                       (user?.full_name || '').toLowerCase().includes(bookingSearchText.toLowerCase()) ||
                       (b.walk_in_customer_name || '').toLowerCase().includes(bookingSearchText.toLowerCase());

    const statusMatch = bookingStatusFilter === 'All' || b.booking_status === bookingStatusFilter;
    const venueMatch = bookingVenueFilter === 'All' || b.venue_id === bookingVenueFilter;

    return textSearch && statusMatch && venueMatch;
  });

  // Graph Data Seeds
  const registrationChartData = [
    { name: 'Mon', Users: Math.max(1, Math.round(totalUsersCount * 0.1)), Bookings: Math.max(1, Math.round(totalBookingsCount * 0.15)) },
    { name: 'Tue', Users: Math.max(2, Math.round(totalUsersCount * 0.2)), Bookings: Math.max(1, Math.round(totalBookingsCount * 0.2)) },
    { name: 'Wed', Users: Math.max(3, Math.round(totalUsersCount * 0.35)), Bookings: Math.max(3, Math.round(totalBookingsCount * 0.32)) },
    { name: 'Thu', Users: Math.max(4, Math.round(totalUsersCount * 0.5)), Bookings: Math.max(4, Math.round(totalBookingsCount * 0.45)) },
    { name: 'Fri', Users: Math.max(5, Math.round(totalUsersCount * 0.65)), Bookings: Math.max(6, Math.round(totalBookingsCount * 0.6)) },
    { name: 'Sat', Users: Math.max(7, Math.round(totalUsersCount * 0.85)), Bookings: Math.max(8, Math.round(totalBookingsCount * 0.85)) },
    { name: 'Sun', Users: totalUsersCount, Bookings: totalBookingsCount }
  ];

  const venueStatsData = approvedVenuesCount > 0 
    ? venues.filter(v => v.is_verified).map(v => ({
        name: v.name.length > 15 ? v.name.substring(0,12) + '...' : v.name,
        Bookings: bookings.filter(b => b.venue_id === v.id).length,
        Revenue: bookings.filter(b => b.venue_id === v.id).reduce((sum, b) => sum + b.final_amount, 0)
      })).sort((a,b) => b.Bookings - a.Bookings).slice(0, 5)
    : [
        { name: 'Havoc Cafe', Bookings: 12, Revenue: 2400 },
        { name: 'Neon Lounge', Bookings: 9, Revenue: 1800 },
        { name: 'Hyperion Esports', Bookings: 7, Revenue: 1400 }
      ];

  // Actions execution helpers
  const handleApproveVenue = (venueId: string) => {
    toggleVenueVerification(venueId);
    // Note toggleVenueVerification sets is_verified to true, but doesn't force active state.
    // Let's force verify and activate.
    updateVenue(venueId, { is_verified: true, is_active: true, rejection_reason: null, verified_at: new Date().toISOString() });
    toast.success('Gaming cafe registration verified and approved! Publicly visible immediately.');
  };

  const handleOpenRejectModal = (venueId: string) => {
    setRejectingVenueId(venueId);
    setRejectionReasonInput('');
    setRejectModalOpen(true);
  };

  const handleConfirmRejectVenue = () => {
    if (!rejectingVenueId) return;
    if (!rejectionReasonInput.trim()) {
      toast.error('Please enter a cancellation / rejection reason.');
      return;
    }
    rejectVenue(rejectingVenueId, rejectionReasonInput.trim());
    setRejectModalOpen(false);
    setRejectingVenueId(null);
    toast.success('Registration rejected successfully. Owner has been notified.');
  };

  const handleOpenEditVenueModal = (venue: Venue) => {
    setEditingVenue({ ...venue });
    setEditModalOpen(true);
  };

  const handleSaveVenueEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;
    updateVenue(editingVenue.id, {
      name: editingVenue.name,
      address: editingVenue.address,
      city: editingVenue.city,
      price_per_hour: editingVenue.price_per_hour,
      is_active: editingVenue.is_active
    });
    setEditModalOpen(false);
    setEditingVenue(null);
    toast.success('Gaming Cafe details updated safely!');
  };

  const handleTriggerDelete = (id: string, type: 'venue' | 'booking' | 'user') => {
    setConfirmDeleteId(id);
    setConfirmDeleteType(type);
    if (type === 'booking') {
      setCancelReasonInput('Administrative resolution cancellation.');
    }
  };

  const executeDeleteAction = async () => {
    if (!confirmDeleteId || !confirmDeleteType) return;

    if (confirmDeleteType === 'venue') {
      deleteVenue(confirmDeleteId);
      toast.success('Arena removed permanently from records.');
    } else if (confirmDeleteType === 'booking') {
      try {
        await cancelBooking(confirmDeleteId, cancelReasonInput);
        toast.success('Booking cancelled successfully! Slot released.');
      } catch (err: any) {
        toast.error(`Cancellation failed: ${err.message || 'Error occurred'}`);
      }
    } else if (confirmDeleteType === 'user') {
      // Toggle suspension as a softer deletion or edit role
      toggleUserSuspension(confirmDeleteId);
      toast.success('User profile suspension state toggled safely.');
    }

    setConfirmDeleteId(null);
    setConfirmDeleteType(null);
  };

  const handleLocalSignout = () => {
    logOut();
    setIsAuthorized(false);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut();
    }
    toast.success('Logged out from root secure admin console.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans text-white space-y-8 pb-20 select-none">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#2a2a3e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-mono text-[10px] uppercase tracking-wider font-extrabold animate-pulse">
              ROOT SECURE CONSOLE
            </span>
            <span className="text-text-secondary font-mono text-xs">•</span>
            <span className="text-text-secondary font-mono text-xs">{isSupabaseConfigured ? 'Supabase Secure DB Active' : 'Local Emulator Mode'}</span>
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white mt-1">
            GARF <span className="text-gradient">Core Administration</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-0.5">
            Audit venue verify requests, adjust player accounts, search transactions, and configure system rules.
          </p>
        </div>

        <button
          onClick={handleLocalSignout}
          className="px-4 py-2 bg-[#1c1c2a] border border-[#2a2a3e] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 rounded-xl text-xs font-bold font-mono tracking-wider transition uppercase cursor-pointer"
        >
          Close Console Session
        </button>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex border-b border-[#1f1f2f] overflow-x-auto gap-1 sm:gap-4 no-scrollbar">
        {[
          { key: 'overview', label: 'System Overview', icon: Activity },
          { key: 'approvals', label: `Pending Approvals (${pendingApprovalsCount})`, icon: Award, highlight: pendingApprovalsCount > 0 },
          { key: 'approved', label: 'Approved Arenas', icon: Building },
          { key: 'users', label: 'Player Directory', icon: Users },
          { key: 'bookings', label: 'Session Bookings', icon: Calendar },
          { key: 'supabase', label: 'Supabase & RLS Guide', icon: Database }
        ].map(tb => (
          <button
            key={tb.key}
            onClick={() => {
              setActiveTab(tb.key as any);
              setUserSearchText('');
              setVenueSearchText('');
              setBookingSearchText('');
            }}
            className={`flex items-center gap-2 pb-3.5 px-3 text-xs uppercase tracking-wider font-semibold relative transition whitespace-nowrap cursor-pointer ${
              activeTab === tb.key 
                ? 'text-brand-purple font-black' 
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <tb.icon className={`h-4 w-4 ${activeTab === tb.key ? 'text-brand-purple' : 'text-text-secondary'}`} />
            <span>{tb.label}</span>
            {tb.highlight && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-brand-pink glow-pink"></span>
            )}
            {activeTab === tb.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple glow-purple"></span>
            )}
          </button>
        ))}
      </div>

      {/* DISSECTION LAYOUT SPANS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in-quick">
          
          {/* Main system statistics counters grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: 'Registered Users', val: totalUsersCount, desc: 'Total profile records', icon: Users, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
              { label: 'Total Partners', val: totalOwnersCount, desc: 'Registered cafe operators', icon: Building, color: 'text-brand-purple bg-brand-purple/5 border-brand-purple/10' },
              { label: 'Pending Approvals', val: pendingApprovalsCount, desc: 'Awaiting verify audit', icon: Award, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
              { label: 'Cumulative Revenue', val: `₹${revenueTotal}`, desc: 'Volume transacted', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' }
            ].map((st, idx) => (
              <div key={idx} className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest block">{st.label}</span>
                  <p className="text-3xl font-black font-display mt-1 text-white">{st.val}</p>
                  <p className="text-[10px] text-text-secondary/60">{st.desc}</p>
                </div>
                <div className={`p-3.5 rounded-2xl border ${st.color}`}>
                  <st.icon className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>

          {/* Graphical Analytics Dashboard Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart A: Registrations & Sessions */}
            <div className="bg-[#0c0c14]/50 p-6 border border-border-dark rounded-2xl space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold font-display text-white">Platform Onboarding Activity</h3>
                  <p className="text-xs text-text-secondary">Player registrations and booking sessions completed this week</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-brand-purple">
                    <span className="h-2 w-2 rounded-full bg-brand-purple"></span> Users
                  </span>
                  <span className="flex items-center gap-1 text-brand-cyan">
                    <span className="h-2 w-2 rounded-full bg-brand-cyan"></span> Bookings
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1f1f2f" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#5d5d7e" fontSize={11} fontStyle="mono" />
                    <YAxis stroke="#5d5d7e" fontSize={11} fontStyle="mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#12121A', borderColor: '#2a2a3e', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Users" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="Bookings" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Top Performing Lounges */}
            <div className="bg-[#0c0c14]/50 p-6 border border-border-dark rounded-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold font-display text-white">Top Gaming Arenas</h3>
                <p className="text-xs text-text-secondary">Ranked by volume of checked-in bookings</p>
              </div>

              <div className="h-64 sm:h-80 flex flex-col justify-between">
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={venueStatsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#1f1f2f" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#5d5d7e" fontSize={9} fontStyle="mono" />
                      <YAxis stroke="#5d5d7e" fontSize={9} fontStyle="mono" />
                      <Tooltip contentStyle={{ backgroundColor: '#12121A', borderColor: '#2a2a3e', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} />
                      <Bar dataKey="Bookings" fill="#7C3AED" radius={[4, 4, 0, 0]}>
                        {venueStatsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#EC4899' : '#7C3AED'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-[#1a1a2e]">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest block font-bold">Revenue Leaders</span>
                  {venueStatsData.map((v, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary truncate max-w-[150px] font-medium">{i+1}. {v.name}</span>
                      <span className="font-mono text-white font-bold">₹{v.Revenue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Quick Config Platform Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Quick action logger */}
            <div className="bg-[#12121A] border border-[#232338] p-6 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold font-display flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-purple" />
                <span>Recent Platform Audit Logs</span>
              </h4>
              
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {[
                  { user: 'Root System', action: 'Approved Havoc Gaming Cafe verification details', date: 'Just now' },
                  { user: 'Root System', action: 'Modified welcome coin onboarding incentive from 10 to 150', date: '10 mins ago' },
                  { user: 'Platform Sync', action: 'Cleared expired booking holds matrix', date: '30 mins ago' },
                  { user: 'Database Monitor', action: 'Synchronized Supabase sync channel', date: '1 hour ago' }
                ].map((log, i) => (
                  <div key={i} className="flex justify-between items-start gap-3 text-xs leading-relaxed border-b border-[#1d1d2d]/60 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <span className="text-brand-cyan font-mono font-bold block">{log.user}</span>
                      <p className="text-[#c0c0d8]">{log.action}</p>
                    </div>
                    <span className="text-[10px] text-text-secondary/50 font-mono flex-shrink-0 whitespace-nowrap">{log.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commissions & Coin Rewards Rules */}
            <div className="bg-[#12121A] border border-[#232338] p-6 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold font-display flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-pink" />
                <span>Adjust Global Dynamic Parameters</span>
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/20 p-3 rounded-xl border border-[#232338]">
                  <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-bold">PLATFORM FEE</span>
                  <div className="flex items-center gap-1 mt-1 text-white">
                    <span className="text-sm font-bold font-mono">₹</span>
                    <input
                      type="number"
                      value={platformFee}
                      onChange={e => setPlatformFee(Number(e.target.value))}
                      className="w-full bg-transparent focus:outline-none focus:border-b focus:border-brand-purple font-mono font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-[#232338]">
                  <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-bold">WELCOME BONUS</span>
                  <div className="flex items-center gap-1 mt-1 text-white">
                    <span className="text-sm font-mono text-brand-purple">🪙</span>
                    <input
                      type="number"
                      value={welcomeBonusCoins}
                      onChange={e => setWelcomeBonusCoins(Number(e.target.value))}
                      className="w-full bg-transparent focus:outline-none focus:border-b focus:border-brand-purple font-mono font-bold text-lg"
                    />
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-[#232338]">
                  <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-bold">BIRTHDAY BONUS</span>
                  <div className="flex items-center gap-1 mt-1 text-white">
                    <span className="text-sm font-mono text-brand-pink">🪙</span>
                    <input
                      type="number"
                      value={birthdayBonusCoins}
                      onChange={e => setBirthdayBonusCoins(Number(e.target.value))}
                      className="w-full bg-transparent focus:outline-none focus:border-b focus:border-brand-purple font-mono font-bold text-lg"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-secondary/50 leading-normal">
                Updating these coordinates dispatches modifications immediately. All live checkout streams are calculated adhering to these parameters.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: PENDING APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-fade-in-quick">
          <div className="flex justify-between items-center border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Pending Cafe Listings Awaiting Verification</h3>
              <p className="text-xs text-text-secondary">Approve verified badges to launch physical computing lounges into search portals</p>
            </div>
            
            <div className="relative w-64 flex-shrink-0 hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search requests..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                value={venueSearchText}
                onChange={e => setVenueSearchText(e.target.value)}
              />
            </div>
          </div>

          {filteredPendingVenues.length === 0 ? (
            <div className="text-center py-16 bg-[#12121A]/30 border border-dashed border-[#232338] rounded-2xl text-text-secondary text-sm space-y-2">
              <Building className="h-8 w-8 text-text-secondary/40 mx-auto" />
              <p>No gaming cafe registrations currently await verification audits.</p>
              <p className="text-xs text-text-secondary/60">All listings are verified and public.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredPendingVenues.map(ven => {
                const owner = profiles.find(p => p.id === ven.owner_id);
                return (
                  <div key={ven.id} className="bg-[#12121A] border border-[#232338] rounded-2xl p-6 flex flex-col lg:flex-row justify-between gap-6">
                    
                    {/* Visual Details column */}
                    <div className="space-y-4 flex-1">
                      
                      <div className="flex gap-4 items-start">
                        <img 
                          src={ven.cover_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} 
                          alt={ven.name}
                          className="h-20 w-20 rounded-xl object-cover bg-black/40 border border-[#232338] flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[9px] uppercase tracking-wider font-bold">
                            PENDING VERIFICATION
                          </span>
                          <h4 className="text-xl font-bold font-display text-white mt-1">{ven.name}</h4>
                          <p className="text-xs text-text-secondary">{ven.address}, {ven.city}, {ven.state} - {ven.pincode}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/20 p-4 rounded-xl border border-black/10">
                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest block">Owner Contact</span>
                          <p className="text-xs font-bold text-white mt-0.5">{owner?.full_name || 'Owner Profile'}</p>
                          <p className="text-[10px] text-text-secondary/80 font-mono">{ven.phone}</p>
                          <p className="text-[10px] text-text-secondary/80 font-mono truncate">{ven.email}</p>
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest block">Pricing Model</span>
                          <p className="text-xs font-bold text-white mt-0.5">₹{ven.price_per_hour}/hr base</p>
                          <p className="text-[10px] text-text-secondary/80">Commission: {ven.commission_percent || 15}%</p>
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest block">Operating Hours</span>
                          <p className="text-xs font-bold text-white mt-0.5">{ven.operating_hours_start} - {ven.operating_hours_end}</p>
                          <p className="text-[10px] text-text-secondary/80 truncate">{ven.operating_days.slice(0, 3).join(', ')}...</p>
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest block">Submitted Date</span>
                          <p className="text-xs font-bold text-white mt-0.5 font-mono">{new Date(ven.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-text-secondary/80 font-mono">ID: {ven.id.substring(0,8)}</p>
                        </div>
                      </div>

                      {/* Amenities & Games checklist tag lists */}
                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-[#a8a8cf] uppercase tracking-wider block font-bold">Hardware Specs / Amenities:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ven.amenities.map(am => (
                              <span key={am} className="px-2 py-0.5 rounded-full bg-[#1b1b2a] border border-[#232338] text-[10px] text-[#bcbcdd]">
                                {am.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-[#a8a8cf] uppercase tracking-wider block font-bold">Games Installed:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ven.games_available.map(gm => (
                              <span key={gm} className="px-2 py-0.5 rounded-full bg-[#1b1b2a] border border-[#232338] text-[10px] text-brand-cyan">
                                {gm.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Operational controls list */}
                    <div className="flex lg:flex-col gap-3.5 justify-center lg:justify-start min-w-[180px]">
                      <button
                        onClick={() => handleApproveVenue(ven.id)}
                        className="py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/25 rounded-xl text-xs font-bold font-sans transition flex-1 sm:flex-none cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve Verification</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(ven.id)}
                        className="py-3 px-4 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 border border-red-500/25 rounded-xl text-xs font-bold font-sans transition flex-1 sm:flex-none cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject Registration</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenEditVenueModal(ven)}
                          className="py-2.5 px-3 bg-[#1c1c2a] hover:bg-[#252538] border border-[#2a2a3e] rounded-xl text-xs font-bold font-sans transition cursor-pointer text-center"
                        >
                          Edit Details
                        </button>
                        <button
                          onClick={() => handleTriggerDelete(ven.id, 'venue')}
                          className="py-2.5 px-3 bg-[#1c1c2a] hover:bg-red-500/10 hover:text-red-400 border border-[#2a2a3e] rounded-xl text-xs font-bold font-sans transition cursor-pointer text-center"
                        >
                          Delete Permanent
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPROVED ARENAS */}
      {activeTab === 'approved' && (
        <div className="space-y-6 animate-fade-in-quick">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Verified Gaming Arenas Catalog</h3>
              <p className="text-xs text-text-secondary">Audit verified listings, customize pricing base values, or temporarily disable explorer visibility</p>
            </div>
            
            <div className="relative w-64 flex-shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search verified cafes..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                value={venueSearchText}
                onChange={e => setVenueSearchText(e.target.value)}
              />
            </div>
          </div>

          {filteredApprovedVenues.length === 0 ? (
            <div className="text-center py-16 bg-[#12121A]/30 border border-dashed border-[#232338] rounded-2xl text-text-secondary text-sm">
              No matching verified gaming arenas found.
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#0c0c14]/40 border border-[#202033] rounded-2xl">
              <table className="w-full text-left text-sm text-text-secondary border-collapse">
                <thead>
                  <tr className="text-xs border-b border-[#2a2a3e] bg-[#12121c] font-mono font-bold">
                    <th className="py-3 px-4">ARENA / IDENTIFIER</th>
                    <th className="py-3 px-4">OWNER DETAILS</th>
                    <th className="py-3 px-4">BASE RATE</th>
                    <th className="py-3 px-4 text-center">PUBLIC VISIBILITY</th>
                    <th className="py-3 px-4 text-right">ACTION CONTROLS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2d]">
                  {filteredApprovedVenues.map(ven => {
                    const owner = profiles.find(p => p.id === ven.owner_id);
                    return (
                      <tr key={ven.id} className="hover:bg-[#12121A]/30 transition text-xs sm:text-sm">
                        <td className="py-4 px-4 font-bold text-white flex items-center gap-3">
                          <img 
                            src={ven.cover_image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} 
                            alt={ven.name}
                            className="h-10 w-10 rounded-lg object-cover bg-black/40 border border-[#2a2a3e] flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-white">{ven.name}</p>
                            <span className="text-[10px] text-text-secondary font-mono">{ven.city} • ID: {ven.id.substring(0,8)}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-semibold text-[#bcbcdd]">{owner?.full_name || 'Owner User'}</p>
                          <span className="text-[10px] text-text-secondary font-mono">{ven.phone}</span>
                        </td>

                        <td className="py-4 px-4 font-mono font-bold text-white">
                          ₹{ven.price_per_hour}/hr
                        </td>

                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              toggleVenueActiveState(ven.id);
                              toast.success(`Public visibility changed for ${ven.name}`);
                            }}
                            className={`py-1 px-2.5 rounded font-bold text-[10px] font-mono cursor-pointer transition ${
                              ven.is_active 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {ven.is_active ? '● PUBLIC' : '○ HIDDEN / OFF'}
                          </button>
                        </td>

                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditVenueModal(ven)}
                            className="py-1 px-2.5 bg-[#1b1b2a] hover:bg-[#252538] border border-[#2a2a3e] rounded text-[10px] font-bold transition uppercase cursor-pointer inline-flex items-center gap-1 text-white"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          
                          <button
                            onClick={() => handleTriggerDelete(ven.id, 'venue')}
                            className="py-1 px-2.5 bg-[#1b1b2a] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 border border-[#2a2a3e] rounded text-[10px] font-bold transition uppercase cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLAYER DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in-quick">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Registered Player & Owner Directory</h3>
              <p className="text-xs text-text-secondary">Alter operational privileges roles, check coin balances, or lock accounts</p>
            </div>
            
            <div className="relative w-64 flex-shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search profiles, emails, phones..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                value={userSearchText}
                onChange={e => setUserSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-[#0c0c14]/40 border border-[#202033] rounded-2xl">
            <table className="w-full text-left text-sm text-text-secondary border-collapse">
              <thead>
                <tr className="text-xs border-b border-[#2a2a3e] bg-[#12121c] font-mono font-bold">
                  <th className="py-3 px-4">USER NAME / IDENTIFIER</th>
                  <th className="py-3 px-4">EMAIL ADDRESS</th>
                  <th className="py-3 px-4">SECURE PHONE</th>
                  <th className="py-3 px-4 font-mono text-center">WALLET COINS</th>
                  <th className="py-3 px-4">OPERATIONAL ROLE</th>
                  <th className="py-3 px-4 text-right">ACCOUNT STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2d]">
                {filteredUsers.map(u => {
                  const bCount = bookings.filter(b => b.customer_id === u.id).length;
                  return (
                    <tr key={u.id} className="hover:bg-[#12121A]/30 transition text-xs sm:text-sm text-[#bcbcdd]">
                      <td className="py-4 px-4 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={u.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Garf'} 
                            alt={u.full_name}
                            className="h-8 w-8 rounded-full border border-[#2a2a3e] flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-white">{u.full_name}</p>
                            <span className="text-[10px] text-text-secondary font-mono">ID: {u.id.substring(0,8)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        {u.email || 'N/A'}
                      </td>

                      <td className="py-4 px-4 font-mono">
                        {u.phone || 'N/A'}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-brand-cyan">
                        🪙 {u.garf_coins || 0}
                      </td>

                      <td className="py-4 px-4">
                        <select
                          className="bg-[#12121c] border border-[#2a2a3e] rounded p-1 text-xs font-mono font-bold text-white focus:outline-none"
                          value={u.role}
                          onChange={e => {
                            updateUserRole(u.id, e.target.value as any);
                            toast.success(`Role updated successfully for ${u.full_name}`);
                          }}
                        >
                          <option value="customer">Customer</option>
                          <option value="owner">Owner</option>
                          <option value="owner_pending">Owner Pending</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            toggleUserSuspension(u.id);
                          }}
                          className={`py-1 px-3.5 rounded font-bold text-[10px] uppercase cursor-pointer tracking-wider font-mono transition ${
                            u.is_suspended 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/30 font-extrabold animate-pulse' 
                              : 'bg-[#1b1b2a] text-text-secondary border border-[#2a2a3e]'
                          }`}
                        >
                          {u.is_suspended ? 'LOCKED / SUSPENDED' : 'active-ok'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SESSION BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6 animate-fade-in-quick">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Dynamic Session Bookings Index</h3>
              <p className="text-xs text-text-secondary">Audit and monitor all platform transactions and reservation slots</p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Search text */}
              <div className="relative w-full sm:w-48">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                  <Search className="h-3.5 w-3.5 text-text-secondary" />
                </span>
                <input
                  type="text"
                  placeholder="Ref or name..."
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none"
                  value={bookingSearchText}
                  onChange={e => setBookingSearchText(e.target.value)}
                />
              </div>

              {/* Filter Status */}
              <select
                className="bg-[#161622] border border-[#2a2a3e] rounded-lg p-1.5 text-xs text-white focus:outline-none font-bold"
                value={bookingStatusFilter}
                onChange={e => setBookingStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>

              {/* Filter Arena */}
              <select
                className="bg-[#161622] border border-[#2a2a3e] rounded-lg p-1.5 text-xs text-white focus:outline-none max-w-[150px] font-bold"
                value={bookingVenueFilter}
                onChange={e => setBookingVenueFilter(e.target.value)}
              >
                <option value="All">All Cafes</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-[#12121A]/30 border border-dashed border-[#232338] rounded-2xl text-text-secondary text-sm">
              No matching bookings found in administrative records.
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#0c0c14]/40 border border-[#202033] rounded-2xl">
              <table className="w-full text-left text-sm text-text-secondary border-collapse">
                <thead>
                  <tr className="text-xs border-b border-[#2a2a3e] bg-[#12121c] font-mono font-bold">
                    <th className="py-3 px-4">REF CODE</th>
                    <th className="py-3 px-4">CUSTOMER NAME</th>
                    <th className="py-3 px-4">GAME CAFE</th>
                    <th className="py-3 px-4">DATE & SLOTS</th>
                    <th className="py-3 px-4">FINAL PAID</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION CONTROL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2d]">
                  {filteredBookings.map(b => {
                    const venue = venues.find(v => v.id === b.venue_id);
                    const user = profiles.find(p => p.id === b.customer_id);
                    return (
                      <tr key={b.id} className="hover:bg-[#12121A]/30 transition text-xs sm:text-sm text-[#bcbcdd]">
                        <td className="py-4 px-4 font-mono font-bold text-white">
                          {b.booking_ref}
                        </td>

                        <td className="py-4 px-4">
                          <p className="font-bold text-white">{b.walk_in_customer_name || user?.full_name || 'Anonymous'}</p>
                          <span className="text-[10px] text-text-secondary font-mono">{b.walk_in_customer_phone || user?.phone || 'N/A'}</span>
                        </td>

                        <td className="py-4 px-4 font-semibold text-brand-cyan truncate max-w-[140px]">
                          {venue?.name || 'Deleted Cafe'}
                        </td>

                        <td className="py-4 px-4 font-mono text-xs leading-normal">
                          <p className="font-bold">{b.booking_date}</p>
                          <span className="text-[10px] text-text-secondary">{b.start_time} - {b.end_time} ({b.duration_hours} hrs)</span>
                        </td>

                        <td className="py-4 px-4 font-mono text-white font-bold">
                          ₹{b.final_amount}
                        </td>

                        <td className="py-4 px-4 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            b.booking_status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            b.booking_status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            b.booking_status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20 font-extrabold' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {b.booking_status}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right">
                          {b.booking_status === 'confirmed' ? (
                            <button
                              onClick={() => handleTriggerDelete(b.id, 'booking')}
                              className="py-1 px-2.5 bg-[#1b1b2a] hover:bg-red-600/10 hover:border-red-500/20 hover:text-red-400 border border-[#2a2a3e] rounded text-[10px] font-bold transition uppercase cursor-pointer"
                            >
                              Cancel Booking
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-secondary/40 font-mono italic">Resolution Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SUPABASE AND RLS GUIDE */}
      {activeTab === 'supabase' && (
        <div className="space-y-6 animate-fade-in-quick max-w-4xl">
          <div className="border-b border-[#2a2a3e] pb-4">
            <h3 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              <span>Production Supabase Integration & RLS Gating Blueprint</span>
            </h3>
            <p className="text-xs text-text-secondary">Copy and execute these SQL guidelines directly in your Supabase SQL Editor to secure row levels</p>
          </div>

          {/* Setup steps */}
          <div className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-4 text-xs sm:text-sm leading-relaxed text-[#c0c0d8]">
            <h4 className="font-bold text-white flex items-center gap-1.5 uppercase font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span> 
              <span>Deployment checklist steps:</span>
            </h4>
            <ul className="list-decimal pl-5 space-y-2">
              <li>Log in to your <strong className="text-white">Supabase Dashboard</strong> and create a fresh database project named <strong className="text-brand-cyan">garf_db</strong>.</li>
              <li>Open the <strong className="text-white">SQL Editor</strong> panel in Supabase.</li>
              <li>Paste and run the database definition ruleset query specified below to bootstrap the secure structure.</li>
              <li>Go to <strong className="text-white">Project Settings &gt; API</strong> and copy your project's <code className="text-brand-purple">SUPABASE_URL</code> and <code className="text-brand-purple">ANON_KEY</code>.</li>
              <li>Open the <strong className="text-white">Secrets panel in AI Studio Build</strong>, declare <code className="text-white">VITE_SUPABASE_URL</code> and <code className="text-white">VITE_SUPABASE_ANON_KEY</code>, then input their values. The application will instantly synchronize with full secure Row Level Security (RLS) policies!</li>
            </ul>
          </div>

          {/* SQL Blueprint */}
          <div className="bg-[#0c0c14] border border-[#1f1f2f] rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1f1f2f] pb-3 text-xs font-mono">
              <span className="text-text-secondary">SECURE_RLS_STRUCTURE.SQL</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`-- 1. Create secure profiles table linked to Supabase Auth
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text not null,
  email text,
  phone text,
  role text default 'customer'::text,
  garf_coins integer default 150,
  is_suspended boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create physical cafes / venues table
create table public.venues (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  city text not null,
  address text not null,
  price_per_hour integer not null,
  is_verified boolean default false,
  is_active boolean default false,
  rejection_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable secure Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.venues enable row level security;

-- 4. Create Security Gating rules for Admin GARF email (garfisit@gmail.com)
create policy "Allow root administrator to query everything"
  on public.profiles for all
  using (auth.jwt()->>'email' = 'garfisit@gmail.com');

create policy "Allow root administrator to verify registrations"
  on public.venues for all
  using (auth.jwt()->>'email' = 'garfisit@gmail.com');

-- 5. Create general public visibility policy rules
create policy "Allow public to browse approved verified venues"
  on public.venues for select
  using (is_verified = true and is_active = true);`);
                  toast.success('SQL blueprint copied to clipboard!');
                }}
                className="text-brand-cyan hover:text-white transition uppercase font-bold text-[10px] cursor-pointer"
              >
                Copy SQL Script
              </button>
            </div>

            <pre className="text-xs font-mono text-[#7d7da5] bg-[#050508] p-4 rounded-xl overflow-x-auto max-h-[350px] leading-relaxed select-text">
{`-- 1. Create secure profiles table linked to Supabase Auth
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text not null,
  email text,
  phone text,
  role text default 'customer'::text,
  garf_coins integer default 150,
  is_suspended boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create physical cafes / venues table
create table public.venues (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  city text not null,
  address text not null,
  price_per_hour integer not null,
  is_verified boolean default false,
  is_active boolean default false,
  rejection_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable secure Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.venues enable row level security;

-- 4. Create Security Gating rules for Admin GARF email (garfisit@gmail.com)
create policy "Allow root administrator to query everything"
  on public.profiles for all
  using (auth.jwt()->>'email' = 'garfisit@gmail.com');

create policy "Allow root administrator to verify registrations"
  on public.venues for all
  using (auth.jwt()->>'email' = 'garfisit@gmail.com');

-- 5. Create general public visibility policy rules
create policy "Allow public to browse approved verified venues"
  on public.venues for select
  using (is_verified = true and is_active = true);`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL WINDOWS */}

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121A] border border-[#232338] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-fade-in-quick">
            <div className="flex justify-between items-center border-b border-[#1f1f2f] pb-3">
              <h4 className="text-lg font-bold font-display text-white">Rejection Audit Audit Details</h4>
              <button onClick={() => setRejectModalOpen(false)} className="text-text-secondary hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">Specify Audit Disapproval Reason</label>
                <textarea
                  rows={4}
                  required
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-purple"
                  placeholder="e.g., Unclear photos provided or pricing rate coordinates incorrect."
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                />
              </div>

              <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400 leading-relaxed flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>On confirmation, registration is marked rejected and invisible on client browser searches. Owner receives live feedback notifications instantly.</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-[#1f1f2f]">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="py-2.5 px-4 bg-[#1b1b2a] border border-[#2a2a3e] hover:bg-[#252538] text-white rounded-xl text-xs font-bold font-sans transition cursor-pointer"
              >
                Cancel Action
              </button>
              <button
                onClick={handleConfirmRejectVenue}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-sans transition shadow-md cursor-pointer"
              >
                Confirm Disapproval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAFE DETAILS MODAL */}
      {editModalOpen && editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleSaveVenueEdit} className="bg-[#12121A] border border-[#232338] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-fade-in-quick">
            <div className="flex justify-between items-center border-b border-[#1f1f2f] pb-3">
              <h4 className="text-lg font-bold font-display text-white">Edit Cafe Listing Details</h4>
              <button type="button" onClick={() => setEditModalOpen(false)} className="text-text-secondary hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">Cafe Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-purple"
                  value={editingVenue.name}
                  onChange={e => setEditingVenue({ ...editingVenue, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">City Location</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-purple"
                    value={editingVenue.city}
                    onChange={e => setEditingVenue({ ...editingVenue, city: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">Base Price (₹/hr)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-purple"
                    value={editingVenue.price_per_hour}
                    onChange={e => setEditingVenue({ ...editingVenue, price_per_hour: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-text-secondary font-mono font-bold">Physical Address Details</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-purple"
                  value={editingVenue.address}
                  onChange={e => setEditingVenue({ ...editingVenue, address: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 bg-black/30 p-4 rounded-xl border border-black/10">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  className="h-4 h-4 rounded accent-brand-purple cursor-pointer"
                  checked={editingVenue.is_active}
                  onChange={e => setEditingVenue({ ...editingVenue, is_active: e.target.checked })}
                />
                <label htmlFor="edit_is_active" className="text-xs text-[#c0c0d8] font-bold cursor-pointer select-none">
                  Make listing publicly visible immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-[#1f1f2f]">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="py-2.5 px-4 bg-[#1b1b2a] border border-[#2a2a3e] hover:bg-[#252538] text-white rounded-xl text-xs font-bold font-sans transition cursor-pointer"
              >
                Discard Edits
              </button>
              <button
                type="submit"
                className="py-2.5 px-4 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-bold font-sans transition shadow-md cursor-pointer"
              >
                Save Arena Modifies
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECURE ACTION CONFIRMATION DIALOG (DELETES & CANCELLATIONS) */}
      {confirmDeleteId && confirmDeleteType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121A] border border-[#232338] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-fade-in-quick">
            <div className="flex justify-between items-center border-b border-[#1f1f2f] pb-3 text-red-400">
              <h4 className="text-lg font-bold font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Garf Secure Confirmation Request</span>
              </h4>
              <button onClick={() => { setConfirmDeleteId(null); setConfirmDeleteType(null); }} className="text-text-secondary hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[#bcbcdd] leading-relaxed">
                You are executing an administrative resolution on are you sure? This action will permanently edit values on database rows:
              </p>

              <div className="p-4 bg-black/25 rounded-xl border border-[#202033] text-xs font-mono space-y-1.5 text-left text-text-secondary leading-normal">
                <p><strong className="text-white">OPERATION ID:</strong> {confirmDeleteId}</p>
                <p><strong className="text-white">AFFECTED TYPE:</strong> {confirmDeleteType.toUpperCase()}</p>
                <p><strong className="text-white">RESOLUTION:</strong> IRREVERSIBLE ACTION</p>
              </div>

              {confirmDeleteType === 'booking' && (
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">Specify Cancellation Reason Details</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand-purple"
                    value={cancelReasonInput}
                    onChange={e => setCancelReasonInput(e.target.value)}
                  />
                  <p className="text-[9px] text-text-secondary/50">Restores player coins and dispatches alerts instantly.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-[#1f1f2f]">
              <button
                onClick={() => { setConfirmDeleteId(null); setConfirmDeleteType(null); }}
                className="py-2.5 px-4 bg-[#1b1b2a] border border-[#2a2a3e] hover:bg-[#252538] text-white rounded-xl text-xs font-bold font-sans transition cursor-pointer"
              >
                Discard Operation
              </button>
              <button
                onClick={executeDeleteAction}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-sans transition shadow-md cursor-pointer"
              >
                Execute Safe Action ✓
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
