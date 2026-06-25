import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Venue } from '../types';
import { 
  Building, LayoutDashboard, CalendarDays, Key, Percent, 
  Cpu, Award, DollarSign, Settings, Users, PlusCircle, ArrowUpRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Tab Subcomponents
import { DashboardTab } from '../components/owner/DashboardTab';
import { BookingsTab } from '../components/owner/BookingsTab';
import { SlotsTab } from '../components/owner/SlotsTab';
import { ResourcesTab } from '../components/owner/ResourcesTab';
import { RevenueTab } from '../components/owner/RevenueTab';
import { ReviewsTab } from '../components/owner/ReviewsTab';
import { OffersTab } from '../components/owner/OffersTab';
import { StaffTab } from '../components/owner/StaffTab';
import { SettingsTab } from '../components/owner/SettingsTab';
import { WalkInModal } from '../components/owner/WalkInModal';

type ConsoleTab = 'dashboard' | 'bookings' | 'slots' | 'resources' | 'revenue' | 'reviews' | 'offers' | 'staff' | 'settings';

export const OwnerDashboardPage: React.FC<{ tab?: ConsoleTab }> = ({ tab }) => {
  const { currentUser, venues } = useApp();

  const [activeTab, setActiveTab] = useState<ConsoleTab>(tab || 'dashboard');

  React.useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);
  
  // Multi-venue selection context
  const ownerVenues = useMemo(() => {
    if (!currentUser) return [];
    return venues.filter(v => v.owner_id === currentUser.id);
  }, [venues, currentUser]);

  const [selectedVenueId, setSelectedVenueId] = useState<string>(ownerVenues[0]?.id || '');

  // Keep in sync with changes in list
  React.useEffect(() => {
    if (ownerVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(ownerVenues[0].id);
    }
  }, [ownerVenues, selectedVenueId]);

  const activeVenue = useMemo(() => {
    return ownerVenues.find(v => v.id === selectedVenueId) || null;
  }, [selectedVenueId, ownerVenues]);

  // Walk-in modal trigger state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [prefilledSlot, setPrefilledSlot] = useState<{ resourceId: string; date: string; hour: string } | null>(null);

  const handleOpenWalkIn = (prefilled?: { resourceId: string; date: string; hour: string } | null) => {
    setPrefilledSlot(prefilled || null);
    setShowWalkInModal(true);
  };

  // Authentication barrier
  if (!currentUser || currentUser.role !== 'owner') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5 text-white">
        <span className="text-6xl animate-pulse">🔐</span>
        <h2 className="text-2xl font-black font-display tracking-tight">Partner Console Locked</h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          The requested dashboard is reserved for verified partner venue operators. Please log in using Partner or Founder coordinates to access reports.
        </p>
        <div className="pt-2">
          <Link 
            to="/login"
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider btn-gradient text-white inline-block cursor-pointer"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // Onboard Empty CTA if has no arenas
  if (ownerVenues.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 sm:px-6 text-center space-y-6 text-white font-sans">
        <span className="text-7xl block">🏢</span>
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black tracking-tight text-white">Let's register your first Arena!</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
            Welcome to the GARF Partner console! Start by registering your venue specification catalog and operating layouts. Once admin reviews, you'll open slots to thousands of players.
          </p>
        </div>
        
        <div className="pt-2">
          <Link
            to="/owner/register"
            className="px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest btn-gradient text-white inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-purple/20 transition hover:scale-101 hover:shadow-brand-purple/30"
          >
            <span>＋ Register Your Venue Free</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="text-[10px] text-text-secondary font-mono tracking-wider max-w-xs mx-auto">
          Need test coordinates? Use pre-verified partner accounts like <strong className="text-white">owner@arena.com</strong> or creator <strong className="text-white">founder@garf.com</strong>.
        </p>
      </div>
    );
  }

  // Sidebar mapping
  const sidebarItems: Array<{ id: ConsoleTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Monitor Console', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings Ledger', icon: CalendarDays },
    { id: 'slots', label: 'Slots & Timelines', icon: Key },
    { id: 'resources', label: 'Station Specs', icon: Cpu },
    { id: 'revenue', label: 'Payout Revenue', icon: DollarSign },
    { id: 'reviews', label: 'Client Reviews', icon: Award },
    { id: 'offers', label: 'Discount offers', icon: Percent },
    { id: 'staff', label: 'Supervisor Staff', icon: Users },
    { id: 'settings', label: 'Venue Settings', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 font-sans text-white space-y-8 pb-24">
      
      {/* GLOBAL switcher menu */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#12121A] p-4.5 rounded-2xl border border-border-dark">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a8a8cf] font-bold block mb-0.5">Active console workspace</span>
            <select
              value={selectedVenueId}
              onChange={e => setSelectedVenueId(e.target.value)}
              className="bg-transparent text-white font-display font-black text-lg outline-none cursor-pointer border-b border-border-dark/60 pb-0.5 max-w-xs"
            >
              {ownerVenues.map(v => (
                <option key={v.id} value={v.id} className="bg-[#1A1A2E] text-white py-1">
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            to="/owner/register"
            className="px-4 py-2 border border-border-dark hover:border-brand-purple bg-[#1A1A2E] text-text-secondary hover:text-white transition rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 flex-1 sm:flex-initial justify-center cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Venue</span>
          </Link>
          <button
            onClick={() => handleOpenWalkIn()}
            className="px-5 py-2 btn-gradient text-white font-bold rounded-xl text-xs uppercase tracking-wider flex-grow sm:flex-grow-0 cursor-pointer text-center"
          >
            ＋ Walk-in Session
          </button>
        </div>
      </div>

      {/* DASHBOARD LAYOUT GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR NAVIGATION BUTTONS */}
        <aside className="lg:col-span-3 bg-[#12121A] border border-border-dark rounded-2xl p-4 space-y-1.5 flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary/60 font-bold block px-3.5 mb-2.5">Dashboard Hub Navigation</span>
          
          {sidebarItems.map(item => {
            const ActiveIcon = item.icon;
            const isTab = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                  isTab 
                    ? 'bg-[#7C3AED]/20 border-l-4 border-brand-purple text-white shadow-md' 
                    : 'text-text-secondary hover:text-white hover:bg-black/15'
                }`}
              >
                <ActiveIcon className={`h-4.5 w-4.5 ${isTab ? 'text-brand-purple' : 'text-text-secondary'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* CONTAINER CONTENT LOAD */}
        <main className="lg:col-span-9 space-y-6">
          {activeTab === 'dashboard' && <DashboardTab venue={activeVenue} onOpenWalkIn={handleOpenWalkIn} />}
          {activeTab === 'bookings' && <BookingsTab venue={activeVenue} onOpenWalkIn={() => handleOpenWalkIn()} />}
          {activeTab === 'slots' && <SlotsTab venue={activeVenue} />}
          {activeTab === 'resources' && <ResourcesTab venue={activeVenue} />}
          {activeTab === 'revenue' && <RevenueTab venue={activeVenue} />}
          {activeTab === 'reviews' && <ReviewsTab venue={activeVenue} />}
          {activeTab === 'offers' && <OffersTab venue={activeVenue} />}
          {activeTab === 'staff' && <StaffTab venue={activeVenue} />}
          {activeTab === 'settings' && <SettingsTab venue={activeVenue} />}
        </main>

      </div>

      {/* FULL-STRETCH MULTI-STEP WALK-IN MODAL FORM */}
      {showWalkInModal && activeVenue && (
        <WalkInModal 
          isOpen={showWalkInModal}
          preselectedSlot={prefilledSlot}
          onClose={() => {
            setShowWalkInModal(false);
            setPrefilledSlot(null);
          }} 
        />
      )}

    </div>
  );
};
