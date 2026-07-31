import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Profile, Venue, Booking } from '../types';
import { 
  ShieldCheck, Users, Building, Activity, Sliders, Check, 
  Trash2, X, AlertTriangle, Search, Info, Settings, ShieldAlert, Coins,
  Lock, Unlock, Edit, Filter, Database, Eye, Calendar, 
  DollarSign, TrendingUp, RefreshCw, Layers, Radio, CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const GarfAdminPage: React.FC = () => {
  const { 
    currentUser, profiles, venues, bookings, platformFee, setPlatformFee, 
    welcomeBonusCoins, setWelcomeBonusCoins, birthdayBonusCoins, setBirthdayBonusCoins,
    updateUserRole, toggleUserSuspension, toggleVenueVerification, toggleVenueActiveState,
    rejectVenue, deleteVenue, updateVenue, cancelBooking, logIn, adminLogs,
    syncDatabase, adjustUserCoins
  } = useApp();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // Route security checks
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(true);

  // Verification dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingVenueId, setRejectingVenueId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [coinsModalOpen, setCoinsModalOpen] = useState(false);
  const [targetUserForCoins, setTargetUserForCoins] = useState<Profile | null>(null);
  const [coinAdjustmentAmount, setCoinAdjustmentAmount] = useState<number>(50);
  const [coinAdjustmentReason, setCoinAdjustmentReason] = useState<string>('Admin Reward');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'venue' | 'booking' | 'user' | null>(null);

  // Root Administrator login password
  const [adminPassword, setAdminPassword] = useState('');

  // Active dashboard tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'approved' | 'users' | 'bookings' | 'settings'>('overview');

  // Interactive filter & search states
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');
  const [venueSearchText, setVenueSearchText] = useState('');
  const [bookingSearchText, setBookingSearchText] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');

  // Real-time Database row counters
  const [dbStats, setDbStats] = useState({
    profilesCount: 0,
    venuesCount: 0,
    bookingsCount: 0,
    slotsCount: 0,
    isRealtimeConnected: false
  });

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

  // Supabase live auth checks on mount
  useEffect(() => {
    const checkSupabaseAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!error && user && (user.email === 'garfisit@gmail.com' || currentUser?.role === 'admin')) {
            setIsAuthorized(true);
          }
        } catch (err) {
          console.error('Supabase Auth Check error:', err);
        }
      }
      setSupabaseLoading(false);
    };
    checkSupabaseAuth();
  }, [currentUser]);

  // Sync authorization state with our global AppContext logged in user
  useEffect(() => {
    if (currentUser && (currentUser.email?.toLowerCase().trim() === 'garfisit@gmail.com' || currentUser.role === 'admin')) {
      setIsAuthorized(true);
    }
  }, [currentUser]);

  // Handle manual or automatic database sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncDatabase();
      setLastSyncTime(new Date().toLocaleTimeString());
      toast.success('Realtime Supabase Database synchronized successfully!');
    } catch (err: any) {
      toast.error(`Database sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Direct Supabase Real-Time Channel Subscription for Admin
  useEffect(() => {
    if (!isAuthorized || !isSupabaseConfigured || !supabase) return;

    console.log('⚡ Admin Console: Subscribing to PostgreSQL Realtime Channels...');
    setDbStats(prev => ({ ...prev, isRealtimeConnected: true }));

    const liveAdminChannel = supabase
      .channel('garf-admin-live-pulse')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        console.log('⚡ Live DB Change [profiles]:', payload);
        syncDatabase();
        setLastSyncTime(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gaming_cafes' }, payload => {
        console.log('⚡ Live DB Change [gaming_cafes]:', payload);
        syncDatabase();
        setLastSyncTime(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_resources' }, payload => {
        console.log('⚡ Live DB Change [venue_resources]:', payload);
        syncDatabase();
        setLastSyncTime(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, payload => {
        console.log('⚡ Live DB Change [slots]:', payload);
        syncDatabase();
        setLastSyncTime(new Date().toLocaleTimeString());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        console.log('⚡ Live DB Change [bookings]:', payload);
        syncDatabase();
        setLastSyncTime(new Date().toLocaleTimeString());
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Realtime Stream Active in Admin Panel');
          setDbStats(prev => ({ ...prev, isRealtimeConnected: true }));
        }
      });

    // Auto-sync on mount
    syncDatabase();

    return () => {
      supabase.removeChannel(liveAdminChannel);
    };
  }, [isAuthorized]);

  // Fetch Supabase Table Stats
  useEffect(() => {
    if (!isAuthorized || !isSupabaseConfigured || !supabase) return;
    const fetchStats = async () => {
      try {
        const [
          { count: pCount },
          { count: vCount },
          { count: bCount },
          { count: sCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('gaming_cafes').select('*', { count: 'exact', head: true }),
          supabase.from('bookings').select('*', { count: 'exact', head: true }),
          supabase.from('slots').select('*', { count: 'exact', head: true })
        ]);

        setDbStats(prev => ({
          ...prev,
          profilesCount: pCount || 0,
          venuesCount: vCount || 0,
          bookingsCount: bCount || 0,
          slotsCount: sCount || 0
        }));
      } catch (e) {
        console.error('Error fetching DB Stats:', e);
      }
    };
    fetchStats();
  }, [isAuthorized, profiles.length, venues.length, bookings.length]);

  // Handle local root password login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = adminPassword.trim();
    if (cleanPass !== 'Garfismine' && cleanPass.toLowerCase() !== 'garfismine' && cleanPass !== 'Garfismine@1234' && cleanPass.toLowerCase() !== 'garfadmin' && cleanPass !== 'garfisit') {
      toast.error('Incorrect Administrator Access Key. Access Denied.');
      return;
    }
    const load = toast.loading('Authenticating Root Console...');
    try {
      await logIn('garfisit@gmail.com');
      setIsAuthorized(true);
      await syncDatabase();
      toast.success('Access Granted. Welcome back, Administrator.', { id: load });
    } catch (err) {
      // Fallback: grant authorization if passkey is correct even if local profile load varies
      setIsAuthorized(true);
      toast.success('Access Granted via Master Access Passkey.', { id: load });
    }
  };

  // Direct Approve Cafe & Owner
  const handleApproveVenueAndOwner = async (venueId: string, ownerId: string) => {
    const load = toast.loading('Approving Gaming Cafe & Granting Owner Privileges...');
    try {
      // 1. Verify Venue
      toggleVenueVerification(venueId);
      
      // 2. Update owner profile role to 'owner'
      const ownerProfile = profiles.find(p => p.id === ownerId);
      if (ownerProfile && ownerProfile.role !== 'owner') {
        updateUserRole(ownerId, 'owner');
      }

      // 3. Save directly to Supabase if active
      if (isSupabaseConfigured && supabase) {
        await supabase.from('gaming_cafes').update({
          status: 'approved',
          is_verified: true,
          is_active: true,
          verified_at: new Date().toISOString()
        }).eq('id', venueId);

        if (ownerId) {
          await supabase.from('profiles').update({
            role: 'owner',
            updated_at: new Date().toISOString()
          }).eq('id', ownerId);
        }
      }

      await syncDatabase();
      toast.success('Cafe approved & Owner role granted in real-time!', { id: load });
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message}`, { id: load });
    }
  };

  // Handle Rejection
  const handleConfirmReject = async () => {
    if (!rejectingVenueId) return;
    if (!rejectionReasonInput.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    const load = toast.loading('Processing cafe rejection...');
    try {
      rejectVenue(rejectingVenueId, rejectionReasonInput.trim());
      if (isSupabaseConfigured && supabase) {
        await supabase.from('gaming_cafes').update({
          status: 'rejected',
          is_verified: false,
          is_active: false,
          rejection_reason: rejectionReasonInput.trim()
        }).eq('id', rejectingVenueId);
      }
      await syncDatabase();
      toast.success('Cafe registration rejected.', { id: load });
      setRejectModalOpen(false);
      setRejectingVenueId(null);
      setRejectionReasonInput('');
    } catch (err: any) {
      toast.error(`Rejection failed: ${err.message}`, { id: load });
    }
  };

  // Handle Award Bonus Coins
  const handleGiveCoins = () => {
    if (!targetUserForCoins) return;
    if (coinAdjustmentAmount <= 0) {
      toast.error('Enter a valid coin amount.');
      return;
    }
    adjustUserCoins(targetUserForCoins.id, coinAdjustmentAmount, coinAdjustmentReason);
    toast.success(`Granted ${coinAdjustmentAmount} GARF Coins to ${targetUserForCoins.full_name}!`);
    setCoinsModalOpen(false);
    setTargetUserForCoins(null);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;

    if (confirmDeleteType === 'venue') {
      const targetVenue = venues.find(v => v.id === confirmDeleteId);
      const vName = targetVenue?.name || 'Gaming Cafe';
      const load = toast.loading(`Deleting ${vName}...`);

      try {
        await deleteVenue(confirmDeleteId);
        adminLogs.addLog(`Deleted venue entirely: ${vName} (${confirmDeleteId})`, 'warning');
        toast.success(`${vName} has been permanently deleted!`, { id: load });
        await syncDatabase(true);
      } catch (err: any) {
        console.error('Delete venue error:', err);
        toast.error(`Delete failed: ${err?.message || 'Unknown error'}`, { id: load });
      }
    }
    setConfirmDeleteId(null);
    setConfirmDeleteType(null);
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
          <p className="text-text-secondary text-sm">Enter administrator access key to open real-time system console.</p>
        </div>

        {/* SECURITY SIGN IN PANEL */}
        <div className="bg-[#12121A] border border-[#232338] p-6 sm:p-8 rounded-2xl text-left space-y-6 shadow-2xl">
          <div className="border-b border-[#2a2a3e] pb-3 flex justify-between items-center">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider font-semibold">CONSOLE GATEWAY ACCESS</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
              Root Authority Gated
            </span>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">Administrator Access Key (Password)</label>
              <input
                type="password"
                required
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white outline-none focus:border-brand-purple font-mono"
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
              />
            </div>

            <div className="p-3.5 bg-brand-purple/5 border border-brand-purple/10 rounded-xl text-xs text-[#a3a3c2] leading-relaxed font-sans flex gap-2">
              <Info className="h-4 w-4 text-brand-purple flex-shrink-0 mt-0.5" />
              <span>Submit secure passkey (<code className="text-brand-pink font-mono">Garfismine</code>) to unlock full real-time database management.</span>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-brand-purple to-brand-pink text-white rounded-xl font-bold font-sans text-xs uppercase tracking-wider hover:brightness-110 shadow-lg cursor-pointer transition active:scale-98"
            >
              Verify Access Key & Enter Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Statistics calculation helpers
  const totalUsersCount = profiles.length;
  const totalOwnersCount = profiles.filter(p => p.role === 'owner' || p.role === 'owner_pending').length;
  const pendingApprovalsCount = venues.filter(v => (v.status ? v.status === 'pending' : (!v.is_verified && !v.rejection_reason))).length;
  const approvedVenuesCount = venues.filter(v => (v.status ? v.status === 'approved' : v.is_verified)).length;
  const totalBookingsCount = bookings.length;
  const revenueTotal = bookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'confirmed').reduce((sum, item) => sum + item.final_amount, 0);

  // Filtered Lists
  const pendingVenuesList = venues.filter(v => (v.status ? v.status === 'pending' : (!v.is_verified && !v.rejection_reason)));
  
  const approvedVenuesList = venues.filter(v => {
    const isApp = v.status ? v.status === 'approved' : v.is_verified;
    const matchSearch = v.name.toLowerCase().includes(venueSearchText.toLowerCase()) || 
                        v.city.toLowerCase().includes(venueSearchText.toLowerCase());
    return isApp && matchSearch;
  });

  const filteredUsersList = profiles.filter(p => {
    const matchSearch = p.full_name.toLowerCase().includes(userSearchText.toLowerCase()) || 
                        p.email.toLowerCase().includes(userSearchText.toLowerCase()) || 
                        p.phone.includes(userSearchText);
    const matchRole = userRoleFilter === 'All' || p.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const filteredBookingsList = bookings.filter(b => {
    const matchSearch = b.id.toLowerCase().includes(bookingSearchText.toLowerCase()) ||
                        b.customer_name?.toLowerCase().includes(bookingSearchText.toLowerCase()) ||
                        b.venue_name?.toLowerCase().includes(bookingSearchText.toLowerCase());
    const matchStatus = bookingStatusFilter === 'All' || b.booking_status === bookingStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans text-white">
      {/* HEADER SECTION WITH REALTIME INDICATOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#12121A] p-6 rounded-3xl border border-[#232338] shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black uppercase tracking-tight text-white flex items-center gap-2">
                GARF <span className="text-brand-purple">ROOT CONSOLE</span>
              </h1>
              <p className="text-xs text-text-secondary">Central Control Hub & Realtime Database Monitor</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* REALTIME PULSE BADGE */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold uppercase tracking-wider">REALTIME POSTGRES ACTIVE</span>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B1B2A] hover:bg-[#25253A] border border-[#2e2e48] text-white rounded-xl text-xs font-bold font-mono transition active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-brand-purple ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Force Sync DB'}</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-[#12121A] border border-[#232338] rounded-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'approvals'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Pending Approvals</span>
          {pendingApprovalsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black font-mono animate-bounce">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Approved Cafes ({approvedVenuesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Directory ({totalUsersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Bookings ({totalBookingsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-lg'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* ==========================================
          TAB 1: OVERVIEW & SYSTEM METRICS
      ========================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Platform Revenue</span>
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-display font-black text-white">₹{revenueTotal.toLocaleString()}</div>
              <div className="text-[10px] text-emerald-400 font-mono">From confirmed & completed bookings</div>
            </div>

            <div className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Cafes</span>
                <Building className="h-5 w-5 text-amber-400" />
              </div>
              <div className="text-2xl font-display font-black text-amber-400">{pendingApprovalsCount}</div>
              <div className="text-[10px] text-text-secondary font-mono">Requires verification approval</div>
            </div>

            <div className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-xs font-bold uppercase tracking-wider">Active Verified Cafes</span>
                <ShieldCheck className="h-5 w-5 text-brand-purple" />
              </div>
              <div className="text-2xl font-display font-black text-white">{approvedVenuesCount}</div>
              <div className="text-[10px] text-brand-purple font-mono">Live on Garf Platform</div>
            </div>

            <div className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-text-secondary">
                <span className="text-xs font-bold uppercase tracking-wider">Registered Accounts</span>
                <Users className="h-5 w-5 text-brand-pink" />
              </div>
              <div className="text-2xl font-display font-black text-white">{totalUsersCount}</div>
              <div className="text-[10px] text-brand-pink font-mono">{totalOwnersCount} Venue Owners</div>
            </div>
          </div>

          {/* REALTIME DATABASE MONITOR CARD */}
          <div className="bg-[#12121A] border border-[#232338] p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-[#232338] pb-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-brand-purple" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Supabase Live Database Monitor</h3>
              </div>
              <span className="text-xs font-mono text-text-secondary">Last Refreshed: {lastSyncTime}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-[#161622] p-4 rounded-xl border border-[#2a2a3e]">
                <div className="text-xs text-text-secondary font-mono uppercase">User Profiles</div>
                <div className="text-xl font-display font-bold text-white mt-1">{dbStats.profilesCount}</div>
              </div>
              <div className="bg-[#161622] p-4 rounded-xl border border-[#2a2a3e]">
                <div className="text-xs text-text-secondary font-mono uppercase">Gaming Cafes</div>
                <div className="text-xl font-display font-bold text-brand-purple mt-1">{dbStats.venuesCount}</div>
              </div>
              <div className="bg-[#161622] p-4 rounded-xl border border-[#2a2a3e]">
                <div className="text-xs text-text-secondary font-mono uppercase">Active Bookings</div>
                <div className="text-xl font-display font-bold text-emerald-400 mt-1">{dbStats.bookingsCount}</div>
              </div>
              <div className="bg-[#161622] p-4 rounded-xl border border-[#2a2a3e]">
                <div className="text-xs text-text-secondary font-mono uppercase">Generated Slots</div>
                <div className="text-xl font-display font-bold text-brand-pink mt-1">{dbStats.slotsCount}</div>
              </div>
            </div>
          </div>

          {/* SYSTEM RECENT LOGS */}
          <div className="bg-[#12121A] border border-[#232338] p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[#232338] pb-4">
              <Activity className="h-5 w-5 text-brand-pink" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">System Audit & Action Logs</h3>
            </div>

            {adminLogs.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-xs font-mono">No administrative logs recorded yet.</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {adminLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="p-3 bg-[#161622] border border-[#2a2a3e] rounded-xl flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-brand-purple/20 text-brand-purple rounded font-mono font-bold uppercase text-[10px]">{log.target_type}</span>
                      <span className="text-white font-medium">{log.action}</span>
                      {log.details && <span className="text-text-secondary text-[11px]">({log.details})</span>}
                    </div>
                    <span className="text-text-secondary/60 text-[10px] font-mono">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: PENDING APPROVALS
      ========================================== */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Pending Cafe Approvals ({pendingVenuesList.length})</h2>
              <p className="text-xs text-text-secondary">Review and approve new gaming cafes and owner account requests in real time.</p>
            </div>
          </div>

          {pendingVenuesList.length === 0 ? (
            <div className="bg-[#12121A] border border-[#232338] p-12 rounded-3xl text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto opacity-80" />
              <p className="text-sm font-bold text-white">All Caught Up!</p>
              <p className="text-xs text-text-secondary">There are no pending gaming cafe submissions awaiting approval right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pendingVenuesList.map(v => {
                const owner = profiles.find(p => p.id === v.owner_id);
                return (
                  <div key={v.id} className="bg-[#12121A] border border-[#232338] rounded-3xl p-6 space-y-6 shadow-xl">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* COVER IMAGE */}
                      <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden bg-[#161622] flex-shrink-0 border border-[#2a2a3e]">
                        {v.cover_image ? (
                          <img src={v.cover_image} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No Cover Image</div>
                        )}
                      </div>

                      {/* DETAILS */}
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-mono font-bold uppercase">
                              PENDING APPROVAL
                            </span>
                            <h3 className="text-xl font-bold text-white mt-2">{v.name}</h3>
                            <p className="text-xs text-text-secondary">{v.type} • {v.city}, {v.state}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-display font-bold text-emerald-400">₹{v.price_per_hour}</span>
                            <span className="text-[10px] text-text-secondary block">/ hour</span>
                          </div>
                        </div>

                        <p className="text-xs text-[#a3a3c2] line-clamp-2">{v.description}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#161622] p-3 rounded-xl border border-[#2a2a3e]">
                          <div>
                            <span className="text-[10px] text-text-secondary block">Owner Name</span>
                            <span className="font-bold text-white">{owner?.full_name || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-secondary block">Contact Phone</span>
                            <span className="font-bold text-white">{v.phone || owner?.phone || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-text-secondary block">Operating Hours</span>
                            <span className="font-bold text-white">{v.operating_hours_start} - {v.operating_hours_end}</span>
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            onClick={() => handleApproveVenueAndOwner(v.id, v.owner_id)}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-98"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve Cafe & Upgrade Owner Role</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingVenueId(v.id);
                              setRejectModalOpen(true);
                            }}
                            className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition"
                          >
                            <X className="h-4 w-4" />
                            <span>Reject Submission</span>
                          </button>

                          <button
                            onClick={() => {
                              setConfirmDeleteId(v.id);
                              setConfirmDeleteType('venue');
                            }}
                            className="px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition"
                            title="Delete Venue Entirely"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete Entirely</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: APPROVED CAFES DIRECTORY
      ========================================== */}
      {activeTab === 'approved' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Approved Gaming Cafes Directory</h2>
              <p className="text-xs text-text-secondary">Manage verification badges, active states, and commission settings.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search cafes or city..."
                value={venueSearchText}
                onChange={e => setVenueSearchText(e.target.value)}
                className="w-full bg-[#12121A] border border-[#232338] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-brand-purple"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedVenuesList.map(v => (
              <div key={v.id} className="bg-[#12121A] border border-[#232338] p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      {v.name}
                      {v.is_verified && <ShieldCheck className="h-4 w-4 text-brand-purple fill-brand-purple/20" />}
                    </h3>
                    <p className="text-xs text-text-secondary">{v.city}, {v.state} • ₹{v.price_per_hour}/hr</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                    v.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {v.is_active ? 'LIVE & ACTIVE' : 'PAUSED'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#232338] text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVenueVerification(v.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                        v.is_verified ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple' : 'bg-white/5 border-white/10 text-text-secondary'
                      }`}
                    >
                      {v.is_verified ? 'Verified' : 'Verify Cafe'}
                    </button>

                    <button
                      onClick={() => toggleVenueActiveState(v.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                        v.is_active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {v.is_active ? 'Pause Cafe' : 'Unpause Cafe'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setConfirmDeleteId(v.id);
                      setConfirmDeleteType('venue');
                    }}
                    className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: USER & OWNER DIRECTORY
      ========================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">User Directory & Role Controls</h2>
              <p className="text-xs text-text-secondary">Manage customer & owner permissions, ban states, and coin rewards.</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="bg-[#12121A] border border-[#232338] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-purple"
              >
                <option value="All">All Roles</option>
                <option value="customer">Customers</option>
                <option value="owner">Owners</option>
                <option value="owner_pending">Owner Pending</option>
                <option value="admin">Admins</option>
              </select>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={userSearchText}
                  onChange={e => setUserSearchText(e.target.value)}
                  className="w-full bg-[#12121A] border border-[#232338] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-brand-purple"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#12121A] border border-[#232338] rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#161622] text-text-secondary font-mono text-[10px] uppercase border-b border-[#232338]">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">GARF Coins</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232338]">
                  {filteredUsersList.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="p-4">
                        <div className="font-bold text-white">{u.full_name}</div>
                        <div className="text-[10px] text-text-secondary">{u.email} • {u.phone}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={e => {
                            updateUserRole(u.id, e.target.value as any);
                            toast.success(`Updated ${u.full_name}'s role to ${e.target.value}`);
                          }}
                          className="bg-[#161622] border border-[#2a2a3e] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-brand-purple outline-none"
                        >
                          <option value="customer">Customer</option>
                          <option value="owner_pending">Owner Pending</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
                          <Coins className="h-3.5 w-3.5" />
                          <span>{u.coins || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          u.is_suspended ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setTargetUserForCoins(u);
                            setCoinsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg font-mono text-[10px] uppercase font-bold hover:bg-amber-500/20 cursor-pointer"
                        >
                          + Coins
                        </button>

                        <button
                          onClick={() => toggleUserSuspension(u.id)}
                          className="px-2.5 py-1 bg-white/5 border border-white/10 text-text-secondary rounded-lg font-mono text-[10px] uppercase font-bold hover:text-white cursor-pointer"
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: BOOKINGS & TRANSACTIONS
      ========================================== */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Bookings & Financial Ledger</h2>
              <p className="text-xs text-text-secondary">Track real-time reservations across all registered gaming cafes.</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={bookingStatusFilter}
                onChange={e => setBookingStatusFilter(e.target.value)}
                className="bg-[#12121A] border border-[#232338] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-purple"
              >
                <option value="All">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="held">Held</option>
              </select>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search booking ID or customer..."
                  value={bookingSearchText}
                  onChange={e => setBookingSearchText(e.target.value)}
                  className="w-full bg-[#12121A] border border-[#232338] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-brand-purple"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#12121A] border border-[#232338] rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#161622] text-text-secondary font-mono text-[10px] uppercase border-b border-[#232338]">
                  <tr>
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Venue</th>
                    <th className="p-4">Date & Slot</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232338]">
                  {filteredBookingsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary font-mono">No bookings found matching filters.</td>
                    </tr>
                  ) : (
                    filteredBookingsList.map(b => (
                      <tr key={b.id} className="hover:bg-white/5 transition">
                        <td className="p-4 font-mono text-brand-purple font-bold">{b.id.substring(0, 8)}...</td>
                        <td className="p-4 font-bold text-white">{b.customer_name}</td>
                        <td className="p-4 text-text-secondary">{b.venue_name}</td>
                        <td className="p-4 font-mono text-[11px]">{b.booking_date} ({b.start_time} - {b.end_time})</td>
                        <td className="p-4 font-mono font-bold text-emerald-400">₹{b.final_amount}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            b.booking_status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            b.booking_status === 'completed' ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20' :
                            b.booking_status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {b.booking_status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {b.booking_status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                cancelBooking(b.id, 'Administrative cancellation');
                                toast.success('Booking cancelled.');
                              }}
                              className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/20 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 6: PLATFORM SETTINGS
      ========================================== */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-[#12121A] border border-[#232338] p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-[#232338] pb-4">
              <Settings className="h-5 w-5 text-brand-purple" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Global Economy Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary uppercase">Platform Fee Commission (%)</label>
                <input
                  type="number"
                  value={platformFee}
                  onChange={e => setPlatformFee(Number(e.target.value))}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary uppercase">Welcome Signup Bonus (GARF Coins)</label>
                <input
                  type="number"
                  value={welcomeBonusCoins}
                  onChange={e => setWelcomeBonusCoins(Number(e.target.value))}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-brand-purple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary uppercase">Birthday Celebration Bonus (GARF Coins)</label>
                <input
                  type="number"
                  value={birthdayBonusCoins}
                  onChange={e => setBirthdayBonusCoins(Number(e.target.value))}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-brand-purple"
                />
              </div>

              <button
                onClick={() => toast.success('Platform economy parameters updated!')}
                className="w-full py-3 bg-gradient-to-r from-brand-purple to-brand-pink text-white rounded-xl font-bold uppercase tracking-wider text-xs cursor-pointer shadow-lg hover:brightness-110"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121A] border border-[#232338] rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white uppercase">Reject Gaming Cafe Submission</h3>
            <p className="text-xs text-text-secondary">Provide a reason for rejection so the venue owner can rectify issues.</p>
            <textarea
              value={rejectionReasonInput}
              onChange={e => setRejectionReasonInput(e.target.value)}
              placeholder="e.g., Incomplete address details or invalid pricing policy..."
              className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 h-28"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-red-600"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COINS AWARD MODAL */}
      {coinsModalOpen && targetUserForCoins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121A] border border-[#232338] rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white uppercase">Grant GARF Bonus Coins</h3>
            <p className="text-xs text-text-secondary">Awarding bonus coins to <span className="text-white font-bold">{targetUserForCoins.full_name}</span>.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Coin Amount</label>
                <input
                  type="number"
                  value={coinAdjustmentAmount}
                  onChange={e => setCoinAdjustmentAmount(Number(e.target.value))}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={coinAdjustmentReason}
                  onChange={e => setCoinAdjustmentReason(e.target.value)}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCoinsModalOpen(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveCoins}
                className="flex-1 py-2.5 bg-amber-500 text-black rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-amber-400"
              >
                Grant Coins
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeleteId && confirmDeleteType === 'venue' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121A] border border-[#232338] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Delete Gaming Cafe</h3>
                <p className="text-xs text-text-secondary">Permanent removal from database</p>
              </div>
            </div>

            <div className="bg-[#161622] p-4 rounded-2xl border border-[#2a2a3e] space-y-2">
              <p className="text-xs text-text-secondary">
                Are you sure you want to permanently delete <span className="text-white font-bold">{venues.find(v => v.id === confirmDeleteId)?.name || 'this venue'}</span>?
              </p>
              <p className="text-[11px] text-red-400/80 font-mono">
                ⚠️ All associated resources, slots, offers, and reviews for this venue will be deleted entirely.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteType(null);
                }}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-500/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Entirely</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
