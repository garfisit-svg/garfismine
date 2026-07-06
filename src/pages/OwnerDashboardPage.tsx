import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Venue } from '../types';
import { 
  Building, LayoutDashboard, CalendarDays, Key, Percent, 
  Cpu, Award, DollarSign, Settings, Users, PlusCircle, ArrowUpRight 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { DashboardTab } from '../components/owner/DashboardTab';
import { BookingsTab } from '../components/owner/BookingsTab';
import { SlotsTab } from '../components/owner/SlotsTab';
import { ResourcesTab } from '../components/owner/ResourcesTab';
import { RevenueTab } from '../components/owner/RevenueTab';
import { ReviewsTab } from '../components/owner/ReviewsTab';
import { OffersTab } from '../components/owner/OffersTab';
import { SettingsTab } from '../components/owner/SettingsTab';
import { WalkInModal } from '../components/owner/WalkInModal';

type ConsoleTab = 'dashboard' | 'bookings' | 'slots' | 'resources' | 'revenue' | 'reviews' | 'offers' | 'settings';

export const OwnerDashboardPage: React.FC<{ tab?: ConsoleTab }> = ({ tab }) => {
  const { currentUser, venues, notifications, updateVenue, deleteVenue, updateProfile } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ConsoleTab>(tab || 'dashboard');

  // Cancel Verification states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Resubmission form states
  const [isEditingRejected, setIsEditingRejected] = useState(false);
  const [resubmitName, setResubmitName] = useState('');
  const [resubmitDesc, setResubmitDesc] = useState('');
  const [resubmitAddress, setResubmitAddress] = useState('');
  const [resubmitPincode, setResubmitPincode] = useState('');
  const [resubmitPhone, setResubmitPhone] = useState('');
  const [resubmitEmail, setResubmitEmail] = useState('');
  const [resubmitPrice, setResubmitPrice] = useState(150);
  const [resubmitUpi, setResubmitUpi] = useState('');

  React.useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);
  
  // Multi-venue selection context
  const ownerVenues = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      return venues; // Admins can view and manage ALL venues!
    }
    return venues.filter(v => v.owner_id === currentUser.id);
  }, [venues, currentUser]);

  const [selectedVenueId, setSelectedVenueId] = useState<string>(ownerVenues[0]?.id || '');

  // Keep in sync with changes in list
  React.useEffect(() => {
    if (ownerVenues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(ownerVenues[0].id);
    }
  }, [ownerVenues, selectedVenueId]);

  const mainVenue = ownerVenues[0];

  React.useEffect(() => {
    if (mainVenue) {
      setResubmitName(mainVenue.name || '');
      setResubmitDesc(mainVenue.description || '');
      setResubmitAddress(mainVenue.address || '');
      setResubmitPincode(mainVenue.pincode || '');
      setResubmitPhone(mainVenue.phone || '');
      setResubmitEmail(mainVenue.email || '');
      setResubmitPrice(mainVenue.price_per_hour || 150);
      setResubmitUpi(currentUser?.upi_id || '');
    }
  }, [mainVenue, currentUser]);

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

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin' && currentUser.role !== 'owner_pending')) {
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

  // Authentication & Verification Pending barrier
  if (currentUser && currentUser.role === 'owner_pending') {
    const mainVenue = ownerVenues[0];
    const handleCancelVerification = async () => {
      if (!mainVenue) return;
      setIsCancelling(true);
      const loadId = toast.loading('Withdrawing your verification application...');
      try {
        deleteVenue(mainVenue.id);
        updateProfile({ role: 'customer' });
        toast.success('Application withdrawn successfully. Your cafe registration has been canceled.', { id: loadId });
        navigate('/explore');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to withdraw application.', { id: loadId });
      } finally {
        setIsCancelling(false);
        setShowCancelConfirm(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto px-4 py-24 sm:px-6 text-center space-y-6 text-white font-sans animate-fade-in-quick">
        <span className="text-7xl block animate-bounce">⏳</span>
        <div className="space-y-3">
          <h2 className="text-3xl font-display font-black tracking-tight text-white font-bold">Verification Pending Approval</h2>
          {mainVenue && (
            <p className="text-brand-purple font-mono font-bold text-sm uppercase tracking-widest">
              FOR: {mainVenue.name}
            </p>
          )}
          <p className="text-text-secondary text-sm max-w-lg mx-auto leading-relaxed">
            Thank you for registering your venue on GARF! Your application is currently under review by our administration team.
            We are verifying your gaming stations, hardware specifications, and configuration to ensure seamless reservations.
          </p>
          <div className="p-5 bg-[#12121A] border border-[#2a2a3e] rounded-xl max-w-md mx-auto text-left text-xs space-y-2 text-text-secondary font-mono">
            <p className="text-white font-bold">What happens next?</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Our admin reviews your PC/Console specifications.</li>
              <li>Your amenities and game library are verified.</li>
              <li>Once verified, your venue goes live on the Explore map.</li>
              <li>You will receive full access to this operational dashboard.</li>
            </ul>
          </div>
        </div>

        {showCancelConfirm ? (
          <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl max-w-md mx-auto space-y-4 animate-fade-in-quick text-left">
            <p className="text-sm font-bold text-red-400 font-display">Confirm Application Withdrawal</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to stop the verification process? This will permanently delete your cafe listing, resources, and slots. You will have to register from scratch to list again.
            </p>
            <div className="flex gap-3 justify-start">
              <button
                onClick={handleCancelVerification}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Withdrawing...' : 'Yes, Withdraw Application'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-[#1c1c2e] hover:bg-[#25253c] border border-[#2a2a3e] text-white transition disabled:opacity-50 cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/25 cursor-pointer"
            >
              Cancel Verification
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem('garf_current_user');
                window.location.href = '/login';
              }}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#1c1c2e] text-white cursor-pointer hover:bg-[#25253c] transition border border-[#2a2a3e]"
            >
              Logout & Switch Account
            </button>
          </div>
        )}
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
