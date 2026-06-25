import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Profile, Venue } from '../types';
import { 
  ShieldCheck, Users, Building, Activity, Sliders, Check, 
  Trash2, X, AlertTriangle, Search, Info, Settings, ShieldAlert, Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminDashboardPage: React.FC = () => {
  const { 
    currentUser, profiles, venues, bookings, platformFee, setPlatformFee, 
    welcomeBonusCoins, setWelcomeBonusCoins, birthdayBonusCoins, setBirthdayBonusCoins,
    updateUserRole, toggleUserSuspension, toggleVenueVerification, toggleVenueActiveState
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'venues' | 'settings'>('overview');

  // Interactive Filter States
  const [userSearchText, setUserSearchText] = useState('');
  const [venueSearchText, setVenueSearchText] = useState('');

  // Settings custom states
  const [inputPlatformFee, setInputPlatformFee] = useState(platformFee.toString());
  const [inputWelcomeCoins, setInputWelcomeCoins] = useState(welcomeBonusCoins.toString());
  const [inputBirthdayCoins, setInputBirthdayCoins] = useState(birthdayBonusCoins.toString());

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4 text-white">
        <span className="text-5xl">🛑</span>
        <h2 className="text-2xl font-bold font-display">Admin Access Only</h2>
        <p className="text-text-secondary text-sm">This area is restricted to system administrator level staff only.</p>
      </div>
    );
  }

  // Computing stats values
  const totalUsersCount = profiles.length;
  const venuesPendingCount = venues.filter(v => !v.is_verified).length;
  const totalBookingsCount = bookings.length;
  const cumulativeVolume = bookings.filter(b => b.booking_status === 'completed').reduce((sum, item) => sum + item.final_amount, 0);

  // Users filter math
  const filteredUsers = profiles.filter(p => {
    return p.full_name.toLowerCase().includes(userSearchText.toLowerCase()) || 
           p.phone.includes(userSearchText);
  });

  // Venues filter math
  const filteredVenues = venues.filter(v => {
    return v.name.toLowerCase().includes(venueSearchText.toLowerCase()) || 
           v.city.toLowerCase().includes(venueSearchText.toLowerCase());
  });

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformFee(Number(inputPlatformFee));
    setWelcomeBonusCoins(Number(inputWelcomeCoins));
    setBirthdayBonusCoins(Number(inputBirthdayCoins));
    toast.success('Platform configurations modified! Dynamic bounds updated live.');
  };

  const executeRoleChange = (userId: string, newRole: 'customer' | 'owner' | 'admin') => {
    updateUserRole(userId, newRole);
    toast.success(`User role adjusted safely to ${newRole}!`);
  };

  const executeToggleSuspension = (userId: string) => {
    toggleUserSuspension(userId);
    const target = profiles.find(p => p.id === userId);
    if (!target) return;
    toast.success(!target.is_suspended ? 'Player profile suspended successfully!' : 'Player profile reactivated.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans select-none text-white space-y-10 pb-20">
      
      {/* HEADER SECTION */}
      <div className="pb-6 border-b border-[#2a2a3e]">
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">System <span className="text-gradient">Console Admin</span></h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">Audit transactions, manage partner verifications, suspend profiles, and configure platform settings</p>
      </div>

      {/* ADMIN TABS GRID */}
      <div className="flex border-b border-border-dark gap-4">
        {[
          { key: 'overview', label: 'System Overview' },
          { key: 'users', label: 'Playground Users' },
          { key: 'venues', label: 'Arena Auditing' },
          { key: 'settings', label: 'Settings Engine' }
        ].map(tb => (
          <button
            key={tb.key}
            onClick={() => setActiveTab(tb.key as any)}
            className={`pb-3.5 text-xs sm:text-sm font-semibold uppercase tracking-wider relative transition ${activeTab === tb.key ? 'text-brand-cyan' : 'text-text-secondary hover:text-white'}`}
          >
            <span>{tb.label}</span>
            {activeTab === tb.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan glow-cyan"></span>
            )}
          </button>
        ))}
      </div>

      {/* DISSECTION LAYOUT SPANS */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fade-in-quick">
          
          {/* Main system cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Registered Players', val: totalUsersCount, desc: 'Profiles on database schema' },
              { label: 'Audits Pending', val: venuesPendingCount, desc: 'Unverified physical locations' },
              { label: 'Total Reservations', val: totalBookingsCount, desc: 'Online check-ins logged' },
              { label: 'Cumulative Vol', val: `₹${cumulativeVolume}`, desc: 'Confirmed player receipts' }
            ].map((st, idx) => (
              <div key={idx} className="bg-[#12121A] border border-[#2a2a3e] p-5 rounded-2xl">
                <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest block">{st.label}</span>
                <p className="text-3xl font-black font-display mt-1.5">{st.val}</p>
                <p className="text-[10px] text-text-secondary/60 mt-1">{st.desc}</p>
              </div>
            ))}
          </div>

          {/* Verification Requests List */}
          <div className="bg-[#0c0c14]/50 p-6 sm:p-8 border border-border-dark rounded-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight font-display text-white">Pending Arena Audits</h3>
              <p className="text-xs text-text-secondary font-mono">Approve partner verification badges to release arenas to the general search catalog</p>
            </div>

            {venues.filter(v => !v.is_verified).length === 0 ? (
              <div className="text-center p-8 bg-black/20 rounded-xl text-text-secondary text-sm">
                No physical arenas currently await verification audits. All locations are active!
              </div>
            ) : (
              <div className="space-y-4">
                {venues.filter(v => !v.is_verified).map(ven => {
                  const owner = profiles.find(p => p.id === ven.owner_id);
                  return (
                    <div key={ven.id} className="p-5 bg-[#12121A] border border-[#232338] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1 leading-normal">
                        <span className="text-[9px] font-mono text-brand-purple font-extrabold uppercase">REQUEST ID: {ven.id.substring(0,6)}</span>
                        <h4 className="font-bold text-white text-base">{ven.name}</h4>
                        <p className="text-xs text-text-secondary">{ven.address}, {ven.city}</p>
                        <p className="text-[10px] text-[#7d7da5]">Listed by owner: <strong className="text-brand-cyan">{owner?.full_name}</strong> ({owner?.phone})</p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => { toggleVenueVerification(ven.id); toast.success(`${ven.name} verified! Approved for explore searches.`); }}
                          className="py-2 px-4 bg-brand-green/10 border border-brand-green/20 hover:bg-brand-green hover:text-black rounded-lg text-xs font-bold font-sans transition flex-1 sm:flex-none cursor-pointer"
                        >
                          Approve Verification ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#0c0c14]/50 p-6 sm:p-8 border border-border-dark rounded-2xl space-y-6 animate-fade-in-quick">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Playground Users Roster</h3>
              <p className="text-xs text-text-secondary">Track customer balances, adjust operational roles, or trigger suspension locks</p>
            </div>

            {/* User Search */}
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search profiles or phone..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                value={userSearchText}
                onChange={e => setUserSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-secondary border-collapse">
              <thead>
                <tr className="text-xs border-b border-[#2a2a3e] font-mono">
                  <th className="py-3 px-4 font-bold">MEMBER NAME</th>
                  <th className="py-3 px-4 font-bold">CONTACT SECURE</th>
                  <th className="py-3 px-4 font-bold">GARF WALLET</th>
                  <th className="py-3 px-4 font-bold">ROLE KEY</th>
                  <th className="py-3 px-4 text-right font-bold">SUSPEND</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d1d2d]">
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id || idx} className="hover:bg-[#12121A]/30 transition text-xs sm:text-sm text-text-secondary">
                    <td className="py-3.5 px-4 font-bold text-white leading-normal">
                      <p>{u.full_name}</p>
                      <span className="text-[10px] text-text-secondary font-mono">ID: {u.id.substring(0,8)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <p>{u.phone}</p>
                      <span className="text-[10px] font-semibold text-brand-cyan uppercase tracking-widest">{u.city}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white font-bold">
                      🪙 {u.garf_coins} coins
                    </td>
                    <td className="py-3.5 px-4 text-white">
                      {/* Dropdown role modification */}
                      <select
                        className="bg-[#161622] border border-[#2a2a3e]/80 rounded p-1.5 min-w-[100px] text-xs focus:outline-none font-bold"
                        value={u.role}
                        onChange={e => executeRoleChange(u.id, e.target.value as any)}
                      >
                        <option value="customer">customer</option>
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {/* Suspension check triggers (Rule 8) */}
                      <button
                        onClick={() => executeToggleSuspension(u.id)}
                        className={`py-1.5 px-4 rounded font-bold text-xs transition cursor-pointer font-semibold ${u.is_suspended ? 'bg-red-500/15 text-red-500 border border-red-500/30' : 'bg-[#1b1b2a] text-[#8484a0] hover:bg-red-600/10 hover:text-red-500 hover:border hover:border-red-500/20'}`}
                      >
                        {u.is_suspended ? 'SUSPENDED' : 'active-ok'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'venues' && (
        <div className="bg-[#0c0c14]/50 p-6 sm:p-8 border border-border-dark rounded-2xl space-y-6 animate-fade-in-quick">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2a2a3e] pb-4">
            <div>
              <h3 className="text-xl font-bold font-display tracking-tight text-white">Complete Arena Auditing Index</h3>
              <p className="text-xs text-text-secondary">Approve, deny, or temporarily suspend customer visibility rules indexes</p>
            </div>

            {/* Venue Search */}
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-text-secondary" />
              </span>
              <input
                type="text"
                placeholder="Search arena name or city..."
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                value={venueSearchText}
                onChange={e => setVenueSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-secondary border-collapse">
              <thead>
                <tr className="text-xs border-b border-[#2a2a3e] font-mono">
                  <th className="py-3 px-4 font-bold">ARENA DETAILS</th>
                  <th className="py-3 px-4 font-bold">OWNER IDENTIFIER</th>
                  <th className="py-3 px-4 font-bold text-center">VERIFIED STATUS</th>
                  <th className="py-3 px-4 font-bold text-center">VISIBILITY STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2d]">
                {filteredVenues.map((v, i) => {
                  const owner = profiles.find(p => p.id === v.owner_id);
                  return (
                    <tr key={v.id || i} className="hover:bg-[#12121A]/30 transition text-xs sm:text-sm text-text-secondary">
                      <td className="py-3.5 px-4 font-bold text-white leading-normal">
                        <p>{v.name}</p>
                        <span className="text-[10px] text-text-secondary block font-mono">{v.city} • {v.address}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white">{owner?.full_name}</p>
                        <span className="text-[10px] text-text-secondary font-mono">{owner?.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => { toggleVenueVerification(v.id); toast.success('Venue verification state changed.'); }}
                          className={`py-1.5 px-3.5 rounded font-black text-[10px] font-mono select-none cursor-pointer ${v.is_verified ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' : 'bg-yellow-500/10 text-yellow-500'}`}
                        >
                          {v.is_verified ? 'VERIFIED ✓' : 'UNVERIFIED ⚠️'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => { toggleVenueActiveState(v.id); toast.success('Venue public visibility state toggled.'); }}
                          className={`py-1.5 px-3.5 rounded font-bold text-xs select-none cursor-pointer ${v.is_active ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-500'}`}
                        >
                          {v.is_active ? 'public-visible' : 'SUSPENDED 🛑'}
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

      {activeTab === 'settings' && (
        <div className="glass-card p-6 sm:p-8 space-y-6 max-w-xl animate-fade-in-quick">
          <div className="border-b border-[#2a2a3e] pb-3 flex items-center gap-2 text-brand-cyan">
            <Sliders className="h-5 w-5" />
            <h3 className="text-xl font-bold font-display text-white">Dynamic Platform Configurations</h3>
          </div>

          <form onSubmit={handleSettingsSave} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase">Platform checkout commissions fee (₹)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-secondary font-mono text-sm leading-none">₹</span>
                <input
                  type="number"
                  required
                  min={0}
                  className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple font-mono"
                  value={inputPlatformFee}
                  onChange={e => setInputPlatformFee(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-text-secondary/60">Charged on every checkout ticket transacted safely.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase">Player welcome onboarding coins credits (🪙)</label>
              <input
                type="number"
                required
                min={10}
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple font-mono"
                value={inputWelcomeCoins}
                onChange={e => setInputWelcomeCoins(e.target.value)}
              />
              <p className="text-[10px] text-text-secondary/60">Bonus coins credited instantly on new player signups.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase">Player anniversary / Birthday coins credits (🪙)</label>
              <input
                type="number"
                required
                min={10}
                className="w-full bg-[#161622] border border-[#2a2a3e] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-purple font-mono"
                value={inputBirthdayCoins}
                onChange={e => setInputBirthdayCoins(e.target.value)}
              />
              <p className="text-[10px] text-text-secondary/60">Auto awarded to players booking slots on birthdays date match.</p>
            </div>

            <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-xl text-xs sm:text-sm text-brand-cyan leading-relaxed flex gap-2 items-start font-medium">
              <Info className="h-4 w-4 text-brand-cyan flex-shrink-0 mt-0.5" />
              <span>Modifying these boundaries dynamic values dispatches instantly on global state context. Future users checkouts will adhere instantly.</span>
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 btn-gradient rounded-lg text-sm font-bold shadow-md cursor-pointer"
            >
              Modify System Configurations
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
